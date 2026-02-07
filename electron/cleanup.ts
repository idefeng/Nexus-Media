/**
 * 清理助手模块
 * 负责 MD5 哈希计算、相似图片检测等功能
 */
import * as crypto from 'crypto'
import * as fs from 'fs'
import {
    updateMd5Hash,
    updateFocusScore,
    getPendingMd5Items,
    getItemsWithEmbedding,
    getExactDuplicates,
    getLowQualityItems,
    getCleanupStats,
    type MediaItemRecord
} from './database'

/**
 * 计算文件的 MD5 哈希值
 */
export async function calculateMd5(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5')
        const stream = fs.createReadStream(filePath)

        stream.on('data', (data) => hash.update(data))
        stream.on('end', () => resolve(hash.digest('hex')))
        stream.on('error', reject)
    })
}

/**
 * 批量处理 MD5 哈希计算
 */
export async function processMd5Batch(): Promise<number> {
    const pendingItems = getPendingMd5Items(30)

    if (pendingItems.length === 0) {
        return 0
    }

    let processed = 0
    for (const item of pendingItems) {
        try {
            if (fs.existsSync(item.path)) {
                const hash = await calculateMd5(item.path)
                updateMd5Hash(item.id, hash)
                processed++
            }
        } catch (error) {
            console.error(`MD5 计算失败: ${item.path}`, error)
        }
    }

    if (processed > 0) {
        console.log(`MD5 批处理: 处理了 ${processed} 个文件`)
    }

    return processed
}

/**
 * 余弦相似度计算
 * similarity = (A · B) / (||A|| × ||B||)
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
}

/**
 * 将 Buffer 转换为 Float32Array
 */
function bufferToFloat32Array(buffer: Buffer): Float32Array {
    return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4)
}

/**
 * 相似图片组
 */
export interface SimilarGroup {
    groupId: number
    similarity: number
    items: { id: number; path: string; size: number }[]
}

/**
 * 检测相似图片（基于 CLIP Embedding 余弦相似度）
 * @param threshold 相似度阈值 (默认 0.95)
 */
export function detectSimilarImages(threshold: number = 0.95): SimilarGroup[] {
    const items = getItemsWithEmbedding()

    if (items.length < 2) {
        return []
    }

    // 使用并查集来分组
    const parent: Map<number, number> = new Map()

    const find = (x: number): number => {
        if (!parent.has(x)) parent.set(x, x)
        if (parent.get(x) !== x) {
            parent.set(x, find(parent.get(x)!))
        }
        return parent.get(x)!
    }

    const union = (x: number, y: number): void => {
        const px = find(x)
        const py = find(y)
        if (px !== py) {
            parent.set(px, py)
        }
    }

    // 存储相似度
    const similarities: Map<string, number> = new Map()

    // 计算两两相似度
    for (let i = 0; i < items.length; i++) {
        const embeddingA = bufferToFloat32Array(items[i].embedding)

        for (let j = i + 1; j < items.length; j++) {
            const embeddingB = bufferToFloat32Array(items[j].embedding)
            const sim = cosineSimilarity(embeddingA, embeddingB)

            if (sim >= threshold) {
                union(items[i].id, items[j].id)
                const key = `${Math.min(items[i].id, items[j].id)}-${Math.max(items[i].id, items[j].id)}`
                similarities.set(key, sim)
            }
        }
    }

    // 按组分类
    const groups: Map<number, { id: number; path: string; size: number }[]> = new Map()
    const groupSimilarity: Map<number, number> = new Map()

    for (const item of items) {
        const root = find(item.id)
        if (!groups.has(root)) {
            groups.set(root, [])
            groupSimilarity.set(root, 1)
        }
        groups.get(root)!.push({
            id: item.id,
            path: item.path,
            size: item.size
        })
    }

    // 过滤只有一个元素的组，并计算组内平均相似度
    const result: SimilarGroup[] = []
    let groupId = 1

    for (const [, groupItems] of Array.from(groups.entries())) {
        if (groupItems.length > 1) {
            // 计算组内平均相似度
            let totalSim = 0
            let count = 0
            for (let i = 0; i < groupItems.length; i++) {
                for (let j = i + 1; j < groupItems.length; j++) {
                    const key = `${Math.min(groupItems[i].id, groupItems[j].id)}-${Math.max(groupItems[i].id, groupItems[j].id)}`
                    if (similarities.has(key)) {
                        totalSim += similarities.get(key)!
                        count++
                    }
                }
            }

            result.push({
                groupId: groupId++,
                similarity: count > 0 ? totalSim / count : threshold,
                items: groupItems.sort((a: { id: number; path: string; size: number }, b: { id: number; path: string; size: number }) => b.size - a.size) // 按大小排序，最大的在前
            })
        }
    }

    return result.sort((a: SimilarGroup, b: SimilarGroup) => b.items.length - a.items.length) // 按组大小排序
}

/**
 * 清理分析结果
 */
export interface CleanupAnalysis {
    stats: {
        duplicateGroups: number
        duplicateFiles: number
        duplicateSize: number
        similarGroups: number
        similarFiles: number
        lowQualityCount: number
        totalCount: number
        potentialSavings: number
    }
    exactDuplicates: { hash: string; count: number; totalSize: number; items: MediaItemRecord[] }[]
    similarImages: SimilarGroup[]
    lowQualityItems: MediaItemRecord[]
}

/**
 * 执行完整的清理分析
 */
export function analyzeCleanup(): CleanupAnalysis {
    console.log('开始清理分析...')

    // 获取基础统计
    const stats = getCleanupStats()

    // 获取精确重复
    const exactDuplicates = getExactDuplicates()

    // 获取相似图片
    const similarImages = detectSimilarImages(0.95)
    const similarFiles = similarImages.reduce((sum, g) => sum + g.items.length - 1, 0)

    // 获取低质量图片
    const lowQualityItems = getLowQualityItems(100)

    // 计算潜在节省空间
    let potentialSavings = stats.duplicateSize
    for (const group of similarImages) {
        // 保留最大的，其余可删除
        for (let i = 1; i < group.items.length; i++) {
            potentialSavings += group.items[i].size
        }
    }

    console.log(`清理分析完成: ${exactDuplicates.length} 组重复, ${similarImages.length} 组相似, ${lowQualityItems.length} 个低质量`)

    return {
        stats: {
            ...stats,
            similarGroups: similarImages.length,
            similarFiles,
            potentialSavings
        },
        exactDuplicates,
        similarImages,
        lowQualityItems
    }
}

/**
 * 将文件移动到回收站
 */
export async function trashItems(ids: number[]) {
    try {
        const { shell } = await import('electron')
        const { getMediaItem, deleteMediaItems } = await import('./database')

        let successCount = 0
        let failCount = 0
        const errors: string[] = []

        for (const id of ids) {
            const item = getMediaItem(id)
            if (item && fs.existsSync(item.path)) {
                try {
                    await shell.trashItem(item.path)
                    successCount++
                } catch (e: any) {
                    failCount++
                    errors.push(e.message)
                }
            } else {
                failCount++
                errors.push(`文件不存在: ID ${id}`)
            }
        }

        // 从数据库中删除记录
        if (successCount > 0) {
            // 这里我们需要过滤出成功的 ID，由于 trashItem 是异步的且没有返回明确成功标识，我们通常假设没报错就是成功
            deleteMediaItems(ids)
        }

        return {
            success: true,
            successCount,
            failCount,
            errors
        }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * 计算清晰度评分
 */
export async function detectBlurryImages(imagePaths: string[]) {
    try {
        const axios = (await import('axios')).default
        const response = await axios.post('http://127.0.0.1:8765/batch-focus', {
            image_paths: imagePaths
        })
        return response.data.results
    } catch (error) {
        console.error('清晰度计算失败:', error)
        return imagePaths.map(path => ({ path, success: false }))
    }
}

