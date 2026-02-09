/**
 * EXIF 元数据提取模块
 * 使用 exiftool-vendored 提供强大的元数据解析能力（支持图片和视频）
 */
import { ExifTool } from 'exiftool-vendored'
import { updateExifData, getPendingExifItems, getExifStats } from './database'

// 全局 ExifTool 实例
let exiftool: ExifTool | null = null
let isProcessing = false

function getExifTool() {
    if (!exiftool) {
        exiftool = new ExifTool({
            taskTimeoutMillis: 20000, // 20秒超时 (在系统繁忙时提供更多余地)
            maxProcs: 4               // 允许4个并发进程
        })
    }
    return exiftool
}

/**
 * EXIF 数据结构
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
export async function extractExifData(filePath: string): Promise<ExifData | null> {
    try {
        const tool = getExifTool()

        // 强制的外部超时控制 (22秒)
        const exifPromise = tool.read(filePath)
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('HARD_TIMEOUT')), 22000))

        const tags = await Promise.race([exifPromise, timeoutPromise]) as any

        if (!tags) return null

        // 提取尽可能全的信息
        const result: ExifData = {
            // 相机信息
            make: tags.Make,
            model: tags.Model,
            software: tags.Software,
            lensModel: tags.LensModel || tags.LensType || tags.LensInfo,
            serialNumber: tags.SerialNumber || tags.InternalSerialNumber,

            // 拍摄参数
            focalLength: tags.FocalLength ? String(tags.FocalLength) : undefined,
            focalLength35mm: tags.FocalLengthIn35mmFormat || tags.FocalLength35efl,
            aperture: tags.FNumber || tags.ApertureValue,
            exposureTime: tags.ExposureTime ? String(tags.ExposureTime) : undefined,
            exposureBias: tags.ExposureCompensation,
            iso: tags.ISO || tags.BaseISO,
            flash: tags.Flash ? String(tags.Flash) : undefined,
            meteringMode: tags.MeteringMode,
            exposureProgram: tags.ExposureProgram,
            whiteBalance: tags.WhiteBalance,
            colorSpace: tags.ColorSpace,

            // 时间 (多字段备选)
            dateTimeOriginal: (tags.DateTimeOriginal || tags.CreateDate || (tags as any).ContentCreateDate)?.toString(),
            modifyDate: tags.ModifyDate?.toString(),
            createDate: tags.CreateDate?.toString(),

            // GPS
            latitude: typeof tags.GPSLatitude === 'number' ? tags.GPSLatitude : undefined,
            longitude: typeof tags.GPSLongitude === 'number' ? tags.GPSLongitude : undefined,
            altitude: tags.GPSAltitude,
            gpsDateStamp: tags.GPSDateStamp,

            // 尺寸与时长
            width: tags.ImageWidth || tags.ExifImageWidth || tags.SourceImageWidth,
            height: tags.ImageHeight || tags.ExifImageHeight || tags.SourceImageHeight,
            orientation: tags.Orientation as number,
            duration: tags.Duration ? parseFloat(String(tags.Duration)) : undefined,
            bitDepth: tags.BitDepth || tags.BitsPerSample,
            fileSize: tags.FileSize,
            mimeType: tags.MIMEType,

            // 为了极致最大化，保存一些未被定义的 Tags 到 raw 中 (可选，如果数据库空间允许)
            // 这里我们只保存一些有意义但没放在顶层的字段
            raw: {
                sceneCaptureType: tags.SceneCaptureType,
                contrast: tags.Contrast,
                saturation: tags.Saturation,
                sharpness: tags.Sharpness,
                digitalZoomRatio: tags.DigitalZoomRatio,
                imageUniqueID: tags.ImageUniqueID
            }
        }

        // 清理 undefined 值
        Object.keys(result).forEach(key => {
            if ((result as any)[key] === undefined) {
                delete (result as any)[key]
            }
        })

        return Object.keys(result).length > 0 ? result : null
    } catch (error) {
        console.error(`元数据提取失败: ${filePath}`, error)

        // 仅在关键错误时重启
        if (String(error).includes('HARD_TIMEOUT')) {
            console.warn(`[EXIF] 检测到硬超时(22s): ${filePath}`)
            // 不再因为单个超时就重启实例
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
                    updateExifData(item.id, { _error: 'processing_failed' })
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
 * 应用关闭时释放 exiftool 资源
 */
export function stopExifTool() {
    if (exiftool) {
        exiftool.end()
        exiftool = null
    }
}
