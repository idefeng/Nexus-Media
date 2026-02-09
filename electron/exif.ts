/**
 * EXIF metadata extraction module
 * Migrated to Python Backend (ai_engine)
 */
import { updateExifData, getPendingExifItems, getExifStats } from './database'

// No local exiftool instance anymore
let isProcessing = false

/**
 * EXIF Data Structure
 */
export interface ExifData {
    // 相机信息
    make?: string           // 相机品牌
    model?: string          // 相机型号
    software?: string       // 处理软件
    lensModel?: string      // 镜头型号
    serialNumber?: string   // 机身序列号

    // 拍摄参数
    focalLength?: string        // 焦距
    focalLength35mm?: string    // 等效 35mm 焦距
    aperture?: number           // 光圈 (f/)
    exposureTime?: string       // 快门速度
    exposureBias?: number       // 曝光补偿
    iso?: number                // ISO 感光度
    flash?: string              // 闪光灯状态
    meteringMode?: string       // 测光模式
    exposureProgram?: string    // 曝光程序
    whiteBalance?: string       // 白平衡
    colorSpace?: string         // 色彩空间

    // 时间
    dateTimeOriginal?: string   // 原始拍摄时间
    modifyDate?: string         // 修改时间
    createDate?: string         // 创建时间

    // GPS 信息
    latitude?: number       // 纬度 (十进制)
    longitude?: number      // 经度 (十进制)
    altitude?: number       // 海拔 (m)
    gpsDateStamp?: string   // GPS 日期

    // 图像/视频信息
    width?: number          // 宽度
    height?: number         // 高度
    orientation?: number    // 方向
    duration?: number       // 时长 (秒)
    bitDepth?: number       // 位深
    fileSize?: string       // 文件大小
    mimeType?: string       // MIME 类型

    // 原始数据备份 (可选存储，为了极致最大化)
    raw?: any
}

/**
 * 从媒体文件提取元数据
 */
/**
 * Extract metadata from media file via Python AI Backend
 */
export async function extractExifData(filePath: string): Promise<ExifData | null> {
    try {
        // Call Python Backend
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

        const response = await fetch('http://127.0.0.1:8765/metadata/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: filePath }),
            signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
            throw new Error(`AI Server Error: ${response.statusText}`)
        }

        const json = await response.json() as any

        if (!json.success || !json.data) {
            return null
        }

        const data = json.data
        return data as ExifData

    } catch (error) {
        console.error(`Metadata extraction failed: ${filePath}`, error)

        if (String(error).includes('AbortError') || String(error).includes('timeout')) {
            console.warn(`[EXIF] Timeout calling AI Server: ${filePath}`)
        }

        return null
    }
}

/**
 * 后台批量处理 EXIF 数据
 */
export async function processExifBatch(): Promise<number> {
    if (isProcessing) {
        console.log('[EXIF] 任务正在运行中，跳过当前批次')
        return 0
    }

    isProcessing = true
    try {
        const pendingItems = getPendingExifItems(40) // 批次大小调整为 40

        if (pendingItems.length === 0) {
            isProcessing = false
            return 0
        }

        const stats = getExifStats()
        console.log(`[EXIF] 开始批次处理: 待处理 ${stats.pending} / 总数 ${stats.total}`)

        let processed = 0
        console.log(`[EXIF] 正在并行处理 ${pendingItems.length} 个项目...`)

        await Promise.all(pendingItems.map(async (item) => {
            try {
                // console.log(`[EXIF] 正在处理: ${path.basename(item.path)}`)
                const exifData = await extractExifData(item.path)

                if (exifData) {
                    updateExifData(item.id, exifData)
                } else {
                    // 标记为失败，避免无限重试
                    console.warn(`[EXIF] 标记为处理失败: ${item.path}`)
                    updateExifData(item.id, { _error: 'processing_failed', _failed_at: new Date().toISOString() })
                }

                processed++
            } catch (error) {
                console.error(`[EXIF] 处理异常: ${item.path} - ${error}`)
            }
        }))

        console.log(`EXIF 批量处理完成: 成功处理 ${processed} 个文件`)
        return processed
    } catch (error) {
        console.error('EXIF 批量处理出错:', error)
        return 0
    } finally {
        isProcessing = false
    }
}

/**
 * Stop resources (Empty now as we use stateless HTTP)
 */
export function stopExifTool() {
    // Nothing to stop
}
