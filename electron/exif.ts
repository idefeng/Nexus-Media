/**
 * EXIF 元数据提取模块
 * 使用 exiftool-vendored 提供强大的元数据解析能力（支持图片和视频）
 */
import { exiftool } from 'exiftool-vendored'
import { updateExifData, getPendingExifItems } from './database'

/**
 * EXIF 数据结构
 */
export interface ExifData {
    // 相机信息
    make?: string           // 相机品牌
    model?: string          // 相机型号
    software?: string       // 处理软件

    // 拍摄参数
    focalLength?: string    // 焦距
    aperture?: number       // 光圈 (f/)
    exposureTime?: string   // 快门速度
    iso?: number            // ISO 感光度
    flash?: string          // 闪光灯状态

    // 时间
    dateTimeOriginal?: string   // 原始拍摄时间

    // GPS 信息
    latitude?: number       // 纬度 (十进制)
    longitude?: number      // 经度 (十进制)
    altitude?: number       // 海拔 (m)

    // 图像/视频信息
    width?: number          // 宽度
    height?: number         // 高度
    orientation?: number    // 方向
    duration?: number       // 时长 (秒)
}

/**
 * 从媒体文件提取元数据
 */
export async function extractExifData(filePath: string): Promise<ExifData | null> {
    try {
        const tags = await exiftool.read(filePath)

        if (!tags) {
            return null
        }

        const result: ExifData = {
            // 相机信息
            make: tags.Make,
            model: tags.Model,
            software: tags.Software,

            // 拍摄参数
            focalLength: tags.FocalLength ? String(tags.FocalLength) : undefined,
            aperture: tags.FNumber || tags.ApertureValue,
            exposureTime: tags.ExposureTime ? String(tags.ExposureTime) : undefined,
            iso: tags.ISO,
            flash: tags.Flash ? String(tags.Flash) : undefined,

            // 时间
            dateTimeOriginal: (tags.DateTimeOriginal || tags.CreateDate || tags.ContentCreateDate)?.toString(),

            // GPS (exiftool 自动处理十进制)
            latitude: tags.GPSLatitude,
            longitude: tags.GPSLongitude,
            altitude: tags.GPSAltitude,

            // 尺寸与时长
            width: tags.ImageWidth || tags.ExifImageWidth,
            height: tags.ImageHeight || tags.ExifImageHeight,
            orientation: tags.Orientation as number,
            duration: tags.Duration ? parseFloat(String(tags.Duration)) : undefined
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
        return null
    }
}

/**
 * 后台批量处理 EXIF 数据
 */
export async function processExifBatch(): Promise<number> {
    const pendingItems = getPendingExifItems(30)

    if (pendingItems.length === 0) {
        return 0
    }

    let processed = 0
    for (const item of pendingItems) {
        try {
            const exifData = await extractExifData(item.path)
            updateExifData(item.id, exifData || {})
            processed++
        } catch (error) {
            console.error(`处理元数据失败: ${item.path}`, error)
            updateExifData(item.id, {})
        }
    }

    return processed
}

/**
 * 应用关闭时释放 exiftool 资源
 */
export function stopExifTool() {
    exiftool.end()
}
