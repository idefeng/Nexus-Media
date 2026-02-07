/**
 * EXIF 元数据提取模块
 * 从图片中提取拍摄设备信息、GPS 坐标等元数据
 */
import * as exifr from 'exifr'
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
    focalLength?: number    // 焦距 (mm)
    aperture?: number       // 光圈 (f/)
    exposureTime?: string   // 快门速度
    iso?: number            // ISO 感光度
    flash?: string          // 闪光灯状态

    // 时间
    dateTimeOriginal?: string   // 原始拍摄时间

    // GPS 信息
    latitude?: number       // 纬度
    longitude?: number      // 经度
    altitude?: number       // 海拔 (m)

    // 图像信息
    width?: number          // 原始宽度
    height?: number         // 原始高度
    orientation?: number    // 方向
    colorSpace?: string     // 色彩空间
}

/**
 * 从图片文件提取 EXIF 数据
 */
export async function extractExifData(imagePath: string): Promise<ExifData | null> {
    try {
        // exifr 自动处理多种图像格式
        const exif = await exifr.parse(imagePath, {
            // 选择要提取的标签
            pick: [
                // 相机信息
                'Make', 'Model', 'Software',
                // 拍摄参数
                'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'Flash',
                // 时间
                'DateTimeOriginal', 'CreateDate',
                // GPS
                'GPSLatitude', 'GPSLongitude', 'GPSAltitude',
                // 图像
                'ImageWidth', 'ImageHeight', 'Orientation', 'ColorSpace',
                'ExifImageWidth', 'ExifImageHeight'
            ],
            // 自动转换 GPS 坐标为十进制
            gps: true
        })

        if (!exif) {
            return null
        }

        // 格式化快门速度
        let exposureTime: string | undefined
        if (exif.ExposureTime) {
            if (exif.ExposureTime < 1) {
                exposureTime = `1/${Math.round(1 / exif.ExposureTime)}s`
            } else {
                exposureTime = `${exif.ExposureTime}s`
            }
        }

        // 格式化闪光灯状态
        let flash: string | undefined
        if (exif.Flash !== undefined) {
            // Flash 值是一个位字段，低位表示是否闪光
            flash = (exif.Flash & 1) ? '已开启' : '未开启'
        }

        const result: ExifData = {
            // 相机信息
            make: exif.Make,
            model: exif.Model,
            software: exif.Software,

            // 拍摄参数
            focalLength: exif.FocalLength,
            aperture: exif.FNumber,
            exposureTime,
            iso: exif.ISO,
            flash,

            // 时间
            dateTimeOriginal: exif.DateTimeOriginal?.toISOString?.() || exif.CreateDate?.toISOString?.(),

            // GPS (exifr 自动转换为十进制)
            latitude: exif.latitude,
            longitude: exif.longitude,
            altitude: exif.GPSAltitude,

            // 图像尺寸
            width: exif.ExifImageWidth || exif.ImageWidth,
            height: exif.ExifImageHeight || exif.ImageHeight,
            orientation: exif.Orientation,
            colorSpace: exif.ColorSpace === 1 ? 'sRGB' : exif.ColorSpace === 2 ? 'Adobe RGB' : undefined
        }

        // 清理 undefined 值
        Object.keys(result).forEach(key => {
            if ((result as any)[key] === undefined) {
                delete (result as any)[key]
            }
        })

        return Object.keys(result).length > 0 ? result : null
    } catch (error) {
        console.error(`EXIF 提取失败: ${imagePath}`, error)
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
            // 即使没有 EXIF 数据，也保存一个空对象，避免重复处理
            updateExifData(item.id, exifData || {})
            processed++
        } catch (error) {
            console.error(`处理 EXIF 失败: ${item.path}`, error)
            // 保存空对象避免重复处理
            updateExifData(item.id, {})
        }
    }

    if (processed > 0) {
        console.log(`EXIF 批处理: 处理了 ${processed} 张图片`)
    }

    return processed
}
