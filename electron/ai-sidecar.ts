/**
 * AI Sidecar 管理器
 * 负责启动、监控和通信 Python AI 后端
 */
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import {
    updateAiTags, updateEmbedding, getPendingAiItems, getAllEmbeddings,
    insertFace, getUnclusteredFaces, updateFacesPerson, createPerson, updatePersonName
} from './database'

const AI_SERVER_PORT = 8765
const AI_SERVER_URL = `http://127.0.0.1:${AI_SERVER_PORT}`
const FACE_THUMBS_DIR = path.join(app.getPath('userData'), 'thumbnails', 'faces')

// 确保人脸缩略图目录存在
if (!fs.existsSync(FACE_THUMBS_DIR)) {
    fs.mkdirSync(FACE_THUMBS_DIR, { recursive: true })
}

let pythonProcess: ChildProcess | null = null
let isServerReady = false

/**
 * 获取 Python 虚拟环境路径
 */
function getPythonPath(): string {
    const isDev = !app.isPackaged
    const basePath = isDev
        ? path.join(process.cwd(), 'ai_engine')
        : path.join(process.resourcesPath, 'ai_engine')

    return path.join(basePath, '.venv', 'Scripts', 'python.exe')
}

/**
 * 获取 AI 脚本路径
 */
function getScriptPath(): string {
    const isDev = !app.isPackaged
    return isDev
        ? path.join(process.cwd(), 'ai_engine', 'main.py')
        : path.join(process.resourcesPath, 'ai_engine', 'main.py')
}

/**
 * 启动 Python AI 服务
 */
export async function startAiServer(): Promise<boolean> {
    if (pythonProcess) {
        console.log('AI 服务已在运行')
        return true
    }

    const pythonPath = getPythonPath()
    const scriptPath = getScriptPath()

    console.log(`启动 AI 服务: ${pythonPath} ${scriptPath}`)

    return new Promise((resolve) => {
        try {
            pythonProcess = spawn(pythonPath, [scriptPath], {
                stdio: ['ignore', 'pipe', 'pipe'],
                windowsHide: true
            })

            pythonProcess.stdout?.on('data', (data) => {
                const output = data.toString()
                console.log('[AI Server]', output)
                if (output.includes('Uvicorn running') || output.includes('Application startup complete')) {
                    isServerReady = true
                    resolve(true)
                }
            })

            pythonProcess.stderr?.on('data', (data) => {
                console.error('[AI Server Error]', data.toString())
            })

            pythonProcess.on('close', (code) => {
                console.log(`AI 服务已退出，退出码: ${code}`)
                pythonProcess = null
                isServerReady = false
            })

            pythonProcess.on('error', (err) => {
                console.error('AI 服务启动失败:', err)
                pythonProcess = null
                resolve(false)
            })

            // 超时检查
            setTimeout(() => {
                if (!isServerReady) {
                    console.log('AI 服务启动超时，尝试健康检查...')
                    checkHealth().then(resolve)
                }
            }, 30000)
        } catch (err) {
            console.error('启动 AI 服务失败:', err)
            resolve(false)
        }
    })
}

/**
 * 停止 Python AI 服务
 */
export function stopAiServer(): void {
    if (pythonProcess) {
        console.log('正在停止 AI 服务...')
        pythonProcess.kill()
        pythonProcess = null
        isServerReady = false
    }
}

/**
 * 健康检查
 */
export async function checkHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${AI_SERVER_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        })
        const data = await response.json()
        isServerReady = data.status === 'ok'
        return isServerReady
    } catch (err) {
        console.error('AI 服务健康检查失败:', err)
        return false
    }
}

/**
 * 分析单张图片
 */
export async function analyzeImage(imagePath: string): Promise<{
    success: boolean
    tags?: { name: string; confidence: number }[]
    embedding?: number[]
    error?: string
}> {
    if (!isServerReady) {
        return { success: false, error: 'AI 服务未就绪' }
    }

    try {
        const response = await fetch(`${AI_SERVER_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_path: imagePath, top_k: 5, threshold: 0.2 }),
            signal: AbortSignal.timeout(30000)
        })

        if (!response.ok) {
            const error = await response.text()
            return { success: false, error }
        }

        const data = await response.json()
        return {
            success: true,
            tags: data.tags,
            embedding: data.embedding
        }
    } catch (err) {
        return { success: false, error: String(err) }
    }
}

/**
 * 将文本转换为向量
 */
export async function embedText(text: string): Promise<{
    success: boolean
    embedding?: number[]
    error?: string
}> {
    if (!isServerReady) {
        return { success: false, error: 'AI 服务未就绪' }
    }

    try {
        const response = await fetch(`${AI_SERVER_URL}/embed-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: AbortSignal.timeout(10000)
        })

        if (!response.ok) {
            const error = await response.text()
            return { success: false, error }
        }

        const data = await response.json()
        return { success: true, embedding: data.embedding }
    } catch (err) {
        return { success: false, error: String(err) }
    }
}

/**
 * 人脸检测
 */
export async function detectFaces(imagePath: string): Promise<{
    success: boolean
    faces?: { bbox: number[]; embedding: number[]; confidence: number; gender: string; age: number; thumbnail_path?: string }[]
    error?: string
}> {
    if (!isServerReady) {
        return { success: false, error: 'AI 服务未就绪' }
    }

    try {
        const response = await fetch(`${AI_SERVER_URL}/detect-faces`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_path: imagePath,
                save_dir: FACE_THUMBS_DIR
            }),
            signal: AbortSignal.timeout(60000)
        })

        if (!response.ok) return { success: false, error: await response.text() }
        const data = await response.json()
        return data
    } catch (err) {
        return { success: false, error: String(err) }
    }
}

/**
 * 批量人脸聚类
 */
export async function clusterFaces(embeddings: number[][], threshold: number = 0.6): Promise<{
    success: boolean
    labels?: number[]
    error?: string
}> {
    if (!isServerReady) return { success: false, error: 'AI 服务未就绪' }

    try {
        const response = await fetch(`${AI_SERVER_URL}/cluster-faces`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeddings, threshold }),
            signal: AbortSignal.timeout(120000)
        })

        if (!response.ok) return { success: false, error: await response.text() }
        const data = await response.json()
        return data
    } catch (err) {
        return { success: false, error: String(err) }
    }
}

/**
 * 计算余弦相似度
 */
function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * 语义搜索
 */
export async function semanticSearch(queryText: string, limit: number = 20): Promise<{
    success: boolean
    results?: { id: number; path: string; similarity: number }[]
    error?: string
}> {
    // 1. 将搜索文本转换为向量
    const embedResult = await embedText(queryText)
    if (!embedResult.success || !embedResult.embedding) {
        return { success: false, error: embedResult.error }
    }

    // 2. 获取所有有 embedding 的媒体项
    const items = getAllEmbeddings()
    if (items.length === 0) {
        return { success: true, results: [] }
    }

    // 3. 计算相似度并排序
    const results = items.map(item => {
        // 将 Buffer 转换回 Float32Array
        const embedding = Array.from(new Float32Array(item.embedding.buffer, item.embedding.byteOffset, item.embedding.length / 4))
        const similarity = cosineSimilarity(embedResult.embedding!, embedding)
        return {
            id: item.id,
            path: item.path,
            similarity: Math.round(similarity * 100) / 100 // 保留两位小数
        }
    })

    // 4. 按相似度排序并返回 top N
    results.sort((a, b) => b.similarity - a.similarity)
    return {
        success: true,
        results: results.slice(0, limit)
    }
}

/**
 * 后台批量处理待分析的图片
 */
export async function processBackgroundAnalysis(): Promise<void> {
    if (!isServerReady) {
        console.log('AI 服务未就绪，跳过后台分析')
        return
    }

    const pendingItems = getPendingAiItems(5) // 每次处理 5 张
    if (pendingItems.length === 0) {
        // 后台清理：对未归类人脸尝试聚类
        await processFacesAndClustering()
        return
    }

    console.log(`后台 AI 分析: 处理 ${pendingItems.length} 张图片`)

    for (const item of pendingItems) {
        try {
            // 1. 基础分析 (CLIP)
            const result = await analyzeImage(item.path)
            if (result.success && result.tags && result.embedding) {
                const tagNames = result.tags.map(t => t.name)
                updateAiTags(item.id, tagNames)
                updateEmbedding(item.id, result.embedding)
                console.log(`AI 分析完成: ${item.name} -> ${tagNames.join(', ')}`)
            }

            // 2. 人脸检测 (Face)
            const faceResult = await detectFaces(item.path)
            if (faceResult.success && faceResult.faces) {
                for (const face of faceResult.faces) {
                    insertFace({
                        media_id: item.id,
                        person_id: null,
                        embedding: Buffer.from(new Float32Array(face.embedding).buffer),
                        bbox: JSON.stringify(face.bbox),
                        confidence: face.confidence,
                        thumbnail_path: face.thumbnail_path || null
                    })
                }
                if (faceResult.faces.length > 0) {
                    console.log(`人脸检测完成: ${item.name} -> 发现 ${faceResult.faces.length} 张人脸`)
                }
            }
        } catch (err) {
            console.error(`AI 分析失败: ${item.path}`, err)
        }

        // 每张图片处理后等待一小段时间，避免占用太多资源
        await new Promise(resolve => setTimeout(resolve, 100))
    }

    // 后台清理：对未归类人脸尝试聚类
    await processFacesAndClustering()
}

/**
 * 处理人脸分析与聚类逻辑
 */
async function processFacesAndClustering() {
    // 1. 获取尚未进行人脸检测的媒体项（我们借用 getPendingAiItems 但稍微限制一下只看图片）
    // 在实际逻辑中，我们可能需要一个新的数据库查询来看看哪些 media_items 在 faces 表里没有记录。
    // 这里简化：如果 ai_tags 已经处理过了，我们就顺便查一下人脸。
    // 更好的做法是增加一个 state 字段。

    // 2. 聚类逻辑
    const unclustered = getUnclusteredFaces()
    if (unclustered.length > 20) { // 累积到一定数量再聚类
        const embeddings = unclustered.map(f => {
            // Buffer 转 Array
            return Array.from(new Float32Array(f.embedding.buffer, f.embedding.byteOffset, f.embedding.length / 4))
        })

        const result = await clusterFaces(embeddings)
        if (result.success && result.labels) {
            console.log(`人脸聚类完成，共处理 ${unclustered.length} 张脸，发现 ${new Set(result.labels.filter(l => l !== -1)).size} 个潜在人物`)

            // 维护一个当前批次的 label -> personId 映射
            const labelToPersonId = new Map<number, number>()

            // 更新数据库
            for (let i = 0; i < unclustered.length; i++) {
                const label = result.labels[i]
                if (label === -1) continue // DBSCAN 的 -1 表示噪声点

                let personId = labelToPersonId.get(label)
                if (personId === undefined) {
                    // 新发现的人物
                    personId = createPerson('未命名人物')
                    labelToPersonId.set(label, personId)
                }

                updateFacesPerson([unclustered[i].id], personId)
            }
        }
    }
}

/**
 * 获取 AI 服务状态
 */
export function getAiStatus(): { running: boolean; ready: boolean } {
    return {
        running: pythonProcess !== null,
        ready: isServerReady
    }
}
