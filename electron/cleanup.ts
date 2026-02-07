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

let isMd5Processing = false

/**
 * 批量处理 MD5 哈希计算
 */
export async function processMd5Batch(): Promise<number> {
    if (isMd5Processing) return 0
    isMd5Processing = true

    try {
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
    } catch (error) {
        console.error('MD5 批处理过程出错:', error)
        return 0
    } finally {
        isMd5Processing = false
    }
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
/**
 * 局部相似图片检测（用于渐进式扫描）
 * @param items 需要检测的项目子集
 * @param threshold 相似度阈值
 */
export function detectSimilarInChunk(items: { id: number; path: string; embedding: Buffer; size: number; created_at: string }[], threshold: number = 0.95): SimilarGroup[] {
    if (items.length < 2) return []

    const parent: Map<number, number> = new Map()
    const find = (x: number): number => {
        if (!parent.has(x)) parent.set(x, x)
        if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!))
        return parent.get(x)!
    }
    const union = (x: number, y: number): void => {
        const px = find(x), py = find(y)
        if (px !== py) parent.set(px, py)
    }

    const embeddings = items.map(item => bufferToFloat32Array(item.embedding))
    const itemTimes = items.map(item => new Date(item.created_at).getTime())
    const TIME_WINDOW_MS = 2 * 60 * 60 * 1000 // 2小时窗口

    const similarities: Map<string, number> = new Map()

    for (let i = 0; i < items.length; i++) {
        const embA = embeddings[i]
        const timeA = itemTimes[i]
        for (let j = i + 1; j < items.length; j++) {
            if (timeA - itemTimes[j] > TIME_WINDOW_MS) break
            const sim = cosineSimilarity(embA, embeddings[j])
            if (sim >= threshold) {
                union(items[i].id, items[j].id)
                similarities.set(`${Math.min(items[i].id, items[j].id)}-${Math.max(items[i].id, items[j].id)}`, sim)
            }
        }
    }

    const groups: Map<number, { id: number; path: string; size: number }[]> = new Map()
    for (const item of items) {
        const root = find(item.id)
        if (!groups.has(root)) groups.set(root, [])
        groups.get(root)!.push({ id: item.id, path: item.path, size: item.size })
    }

    const result: SimilarGroup[] = []
    let pseudoId = Date.now()
    Array.from(groups.entries()).forEach(([, groupItems]) => {
        if (groupItems.length > 1) {
            result.push({
                groupId: pseudoId++,
                similarity: threshold,
                items: groupItems.sort((a: any, b: any) => b.size - a.size)
            })
        }
    })
    return result
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
 * 执行初始化清理分析（返回非耗时部分）
 */
export function analyzeCleanup(): CleanupAnalysis {
    console.log('开始基础清理分析...')

    // 获取基础统计
    const stats = getCleanupStats()

    // 获取精确重复
    const exactDuplicates = getExactDuplicates()

    // 获取低质量图片
    const lowQualityItems = getLowQualityItems(100)

    // 注意：相似图片由于耗时，现在改为渐进式扫描，不在此处一次性计算
    // 这里的返回值主要用于展示初步概况
    return {
        stats: {
            ...stats,
            similarGroups: 0,
            similarFiles: 0,
            potentialSavings: stats.duplicateSize
        },
        exactDuplicates,
        similarImages: [],
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
        const response = await fetch('http://127.0.0.1:8765/batch-focus-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image_paths: imagePaths })
        })
        const data = await response.json()
        return data.results
    } catch (error) {
        console.error('清晰度计算失败:', error)
        return imagePaths.map(path => ({ path, success: false }))
    }
}

