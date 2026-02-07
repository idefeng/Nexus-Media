/**
 * 缩略图生成服务
 * 使用 Sharp 处理图片，fluent-ffmpeg 处理视频
 */
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { app } from 'electron'
import { updateThumbnailPath, getPendingThumbnailItems } from './database'

// 设置 ffmpeg 路径
// 查找可用 FFmpeg 路径的函数
function getFFmpegPath(): string | null {
    const possiblePaths: string[] = []

    // 1. 优先检查 ffmpeg-static 提供的路径
    if (ffmpegPath) {
        // 修复 asar 路径问题
        const fixedPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked')
        possiblePaths.push(fixedPath)
        possiblePaths.push(ffmpegPath)
    }

    // 2. 检查开发环境常见的备选路径
    possiblePaths.push(
        path.join(process.cwd(), 'node_modules', '.ignored', 'ffmpeg-static', 'ffmpeg.exe'),
        path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
        path.join(path.dirname(__dirname), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'), // dist-electron/../node_modules
        // 针对打包后的环境
        path.join(process.resourcesPath, 'ffmpeg.exe'),
        path.join(process.resourcesPath, 'bin', 'ffmpeg.exe')
    )

    // 尝试遍历所有可能的路径
    for (const p of possiblePaths) {
        if (p && fs.existsSync(p)) {
            console.log('Found FFmpeg binary at:', p)
            return p
        }
    }

    return null
}

const resolvedFFmpegPath = getFFmpegPath()

if (resolvedFFmpegPath) {
    ffmpeg.setFfmpegPath(resolvedFFmpegPath)
} else {
    console.error('CRITICAL: FFmpeg binary not found in any known location. Video processing will FAIL.')
    // 最后的尝试：如果系统环境变量里有
    ffmpeg.setFfmpegPath('ffmpeg')
}

// 缩略图目录
let thumbnailsDir: string = ''

/**
 * 初始化缩略图目录
 */
export function initThumbnailsDir() {
    thumbnailsDir = path.join(app.getPath('userData'), 'thumbnails')
    console.log('Thumbnails directory:', thumbnailsDir)
    if (!fs.existsSync(thumbnailsDir)) {
        fs.mkdirSync(thumbnailsDir, { recursive: true })
    }
}

/**
 * 获取文件路径的 MD5 哈希作为缩略图文件名
 */
function getHash(filePath: string): string {
    return crypto.createHash('md5').update(filePath).digest('hex')
}

/**
 * 为图片生成缩略图
 */
async function generateImageThumbnail(filePath: string, outputDir: string): Promise<string> {
    const hash = getHash(filePath)
    const outputPath = path.join(outputDir, `${hash}.webp`)

    // 如果已经存在，直接返回
    if (fs.existsSync(outputPath)) return outputPath

    await sharp(filePath)
        .resize(300, 300, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(outputPath)

    return outputPath
}

/**
 * 为视频生成缩略图
 */
async function generateVideoThumbnail(filePath: string, outputDir: string): Promise<string> {
    const hash = getHash(filePath)
    const outputPath = path.join(outputDir, `${hash}.webp`)
    const tempJpg = path.join(outputDir, `${hash}.jpg`)

    if (fs.existsSync(outputPath)) return outputPath

    return new Promise((resolve, reject) => {
        ffmpeg(filePath)
            .screenshots({
                timestamps: [1], // 第 1 秒
                folder: outputDir,
                filename: `${hash}.jpg`,
                size: '300x?'
            })
            .on('end', async () => {
                try {
                    if (fs.existsSync(tempJpg)) {
                        // 转换为 webp 以节省空间并统一格式
                        await sharp(tempJpg)
                            .resize(300, 300, { fit: 'cover' })
                            .webp({ quality: 80 })
                            .toFile(outputPath)

                        // 延迟删除临时 jpg（避免 Windows 文件锁定问题）
                        setTimeout(() => {
                            try {
                                if (fs.existsSync(tempJpg)) {
                                    fs.unlinkSync(tempJpg)
                                }
                            } catch {
                                // 忽略删除失败，不影响主流程
                            }
                        }, 500)

                        resolve(outputPath)
                    } else {
                        reject(new Error('FFmpeg processing finished but output file missing'))
                    }
                } catch (err) {
                    reject(err)
                }
            })
            .on('error', (err) => {
                console.error(`FFmpeg error for ${filePath}:`, err)
                reject(err)
            })
    })
}

// 队列控制
let isProcessing = false
const CONCURRENCY_LIMIT = 4

/**
 * 开始后台处理任务队列
 */
export async function startThumbnailBatch() {
    if (isProcessing) return
    isProcessing = true

    console.log('开始后台缩略图生成提取任务...')

    try {
        const pendingItems = getPendingThumbnailItems()
        console.log(`发现 ${pendingItems.length} 个待处理项`)

        // 简单的并发控制
        for (let i = 0; i < pendingItems.length; i += CONCURRENCY_LIMIT) {
            const batch = pendingItems.slice(i, i + CONCURRENCY_LIMIT)

            await Promise.all(batch.map(async (item) => {
                try {
                    let thumbPath = ''
                    if (item.type === 'image') {
                        thumbPath = await generateImageThumbnail(item.path, thumbnailsDir)
                    } else if (item.type === 'video') {
                        thumbPath = await generateVideoThumbnail(item.path, thumbnailsDir)
                    }

                    if (thumbPath) {
                        updateThumbnailPath(item.id, thumbPath)
                    }
                } catch (err) {
                    console.error(`生成缩略图失败 [${item.id}]: ${item.path}`, err)
                }
            }))
        }
    } catch (err) {
        console.error('缩略图批处理过程出错:', err)
    } finally {
        isProcessing = false
        console.log('背景缩略图处理任务空闲/结束')
    }
}
