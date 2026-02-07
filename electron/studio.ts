import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import axios from 'axios'
import { searchByEmbedding, addCreation, getItemsWithEmbedding } from './database'
import { MediaItemRecord } from './database'

const AI_ENGINE_URL = 'http://127.0.0.1:8765'

/**
 * AI 创意工作室处理逻辑
 */
export async function generateCollage(options: {
    type: 'text' | 'image'
    prompt?: string
    referenceIds?: number[]
    style: 'compact' | 'masonry' | 'filmstrip'
    backgroundColor: string
    limit?: number
}) {
    try {
        let targetEmbedding: number[] = []

        // 1. 获取目标向量
        if (options.type === 'text' && options.prompt) {
            console.log(`正在获取文本向量: ${options.prompt}`)
            const response = await axios.post(`${AI_ENGINE_URL}/embed-text`, {
                text: options.prompt
            })
            targetEmbedding = response.data.embedding
        } else if (options.type === 'image' && options.referenceIds?.length) {
            console.log(`正在从参考图片获取向量: ${options.referenceIds.join(',')}`)
            // 如果只有一张图，直接取其向量；如果多张，取平均值
            const items = getItemsWithEmbedding().filter(i => options.referenceIds!.includes(i.id))
            if (items.length > 0) {
                const dim = 512
                targetEmbedding = new Array(dim).fill(0)
                items.forEach(item => {
                    const emb = new Float32Array(item.embedding.buffer)
                    for (let i = 0; i < dim; i++) targetEmbedding[i] += emb[i]
                })
                targetEmbedding = targetEmbedding.map(v => v / items.length)
            }
        }

        if (targetEmbedding.length === 0) {
            throw new Error('无法获取有效的特征向量进行搜索')
        }

        // 2. 数据库特征搜索
        const matches = searchByEmbedding(targetEmbedding, options.limit || 30)
        if (matches.length === 0) {
            throw new Error('未找到风格匹配的照片，请尝试更换关键词')
        }

        // 3. 准备保存目录
        // 获取用户库目录（简便起见，取第一张匹配图的父目录同级或图片文件夹）
        const creationDir = path.join(app.getPath('pictures'), 'Nexus Creations')
        if (!fs.existsSync(creationDir)) {
            fs.mkdirSync(creationDir, { recursive: true })
        }

        const timestamp = Date.now()
        const fileName = `Nexus_Collage_${timestamp}.jpg`
        const outputPath = path.join(creationDir, fileName)

        // 4. 调用 Python 后端渲染
        console.log(`正在请求生成拼图: ${outputPath}`)
        const collageResponse = await axios.post(`${AI_ENGINE_URL}/collage`, {
            image_paths: matches.map(m => m.path),
            style: options.style,
            background_color: options.backgroundColor,
            output_path: outputPath
        })

        if (!collageResponse.data.success) {
            throw new Error(`拼图生成失败: ${collageResponse.data.error}`)
        }

        // 5. 存储到数据库
        const stats = fs.statSync(outputPath)
        const id = addCreation({
            path: outputPath,
            name: fileName,
            size: stats.size,
            type: 'image',
            ext: '.jpg',
            tags: JSON.stringify(['#AI拼图', options.prompt ? `#主题:${options.prompt}` : '#风格匹配']),
            notes: `AI 创意工作室生成 - 风格: ${options.style}`,
            width: 3840,
            height: 2160
        })

        return {
            success: true,
            id,
            path: outputPath,
            fileName,
            count: matches.length
        }

    } catch (error: any) {
        console.error('创意生成失败:', error)
        return {
            success: false,
            error: error.message || '未知错误'
        }
    }
}
