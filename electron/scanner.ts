/**
 * 文件扫描引擎
 * 使用 Node.js fs 模块实现异步递归扫描
 */
import * as fs from 'fs'
import * as path from 'path'

// 支持的媒体文件后缀
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.mov', '.avi', '.wmv'])
const ALL_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS])

// 媒体文件信息接口
export interface ScannedFile {
    path: string
    name: string
    size: number
    type: 'image' | 'video'
    ext: string
    birthTime: Date
    modifiedTime: Date
}

// 扫描进度回调
export interface ScanProgress {
    currentPath: string
    filesFound: number
    newFiles: ScannedFile[]
}

/**
 * 检查文件是否为支持的媒体类型
 */
function isMediaFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase()
    return ALL_EXTENSIONS.has(ext)
}

/**
 * 获取媒体类型
 */
function getMediaType(filePath: string): 'image' | 'video' {
    const ext = path.extname(filePath).toLowerCase()
    return IMAGE_EXTENSIONS.has(ext) ? 'image' : 'video'
}

/**
 * 获取文件信息
 */
async function getFileInfo(filePath: string): Promise<ScannedFile | null> {
    try {
        const stats = await fs.promises.stat(filePath)
        if (!stats.isFile()) return null

        const ext = path.extname(filePath).toLowerCase()

        return {
            path: filePath,
            name: path.basename(filePath),
            size: stats.size,
            type: getMediaType(filePath),
            ext: ext.substring(1), // 移除前面的点
            birthTime: stats.birthtime,
            modifiedTime: stats.mtime
        }
    } catch (error) {
        console.error(`读取文件信息失败: ${filePath}`, error)
        return null
    }
}

/**
 * 异步递归扫描文件夹
 * @param folderPath 要扫描的文件夹路径
 * @param onProgress 进度回调函数
 * @param batchSize 批量发送的文件数量
 */
export async function scanFolder(
    folderPath: string,
    onProgress: (progress: ScanProgress) => void,
    batchSize: number = 50
): Promise<ScannedFile[]> {
    const allFiles: ScannedFile[] = []
    const batch: ScannedFile[] = []

    async function scanDirectory(dirPath: string): Promise<void> {
        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name)

                if (entry.isDirectory()) {
                    // 递归扫描子目录
                    await scanDirectory(fullPath)
                } else if (entry.isFile() && isMediaFile(fullPath)) {
                    const fileInfo = await getFileInfo(fullPath)
                    if (fileInfo) {
                        allFiles.push(fileInfo)
                        batch.push(fileInfo)

                        // 达到批量大小时发送进度
                        if (batch.length >= batchSize) {
                            onProgress({
                                currentPath: dirPath,
                                filesFound: allFiles.length,
                                newFiles: [...batch]
                            })
                            batch.length = 0 // 清空批次
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`扫描目录失败: ${dirPath}`, error)
        }
    }

    await scanDirectory(folderPath)

    // 发送剩余的文件
    if (batch.length > 0) {
        onProgress({
            currentPath: folderPath,
            filesFound: allFiles.length,
            newFiles: [...batch]
        })
    }

    return allFiles
}

/**
 * 扫描多个文件夹
 */
export async function scanFolders(
    folderPaths: string[],
    onProgress: (progress: ScanProgress) => void,
    batchSize: number = 50
): Promise<ScannedFile[]> {
    const allFiles: ScannedFile[] = []

    for (const folderPath of folderPaths) {
        const files = await scanFolder(folderPath, onProgress, batchSize)
        allFiles.push(...files)
    }

    return allFiles
}
