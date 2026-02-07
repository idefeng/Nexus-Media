/**
 * EXIF 元数据提取模块
 * 使用 exiftool-vendored 提供强大的元数据解析能力（支持图片和视频）
 */
import { ExifTool } from 'exiftool-vendored'
import { updateExifData, getPendingExifItems, getExifStats } from './database'

// 全局 ExifTool 实例
let exiftool: ExifTool | null = null

function getExifTool() {
    if (!exiftool) {
        exiftool = new ExifTool({
            taskTimeoutMillis: 30000, // 30秒超时
            maxProcs: 2               // 允许2个并发进程
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
        const tool = getExifTool()
        // const tags = await tool.read(filePath) // Original simple read

        // 强制的外部超时控制 (35秒 - 比库的 30秒 稍长，作为最后的安全网)
        const exifPromise = tool.read(filePath)
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('HARD_TIMEOUT')), 35000))

        const tags = await Promise.race([exifPromise, timeoutPromise]) as any

        if (!tags) return null

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
            dateTimeOriginal: (tags.DateTimeOriginal || tags.CreateDate || (tags as any).ContentCreateDate)?.toString(),

            // GPS (exiftool 自动处理十进制，需要转换为 number)
            latitude: typeof tags.GPSLatitude === 'number' ? tags.GPSLatitude : undefined,
            longitude: typeof tags.GPSLongitude === 'number' ? tags.GPSLongitude : undefined,
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

        // 仅在关键错误时重启
        if (String(error).includes('HARD_TIMEOUT')) {
            console.warn('[EXIF] 检测到硬超时(35s)，强制销毁 ExifTool 实例')
            if (exiftool) {
                exiftool.end().catch(() => { })
                exiftool = null
            }
        }
        return null
    }
}

/**
 * 后台批量处理 EXIF 数据
 */
export async function processExifBatch(): Promise<number> {
    try {
        const pendingItems = getPendingExifItems(30)

        if (pendingItems.length === 0) {
            return 0
        }

        const stats = getExifStats()
        console.log(`[EXIF] 开始批次处理: 待处理 ${stats.pending} / 总数 ${stats.total}`)

        let processed = 0

        for (const item of pendingItems) {
            try {
                // console.log(`[EXIF Step] Processing: ${item.path}`)

                // 直接调用 extractedExifData，它内部现在有了超时保护
                const exifData = await extractExifData(item.path)

                // 无论是 null (失败) 还是 有数据，都标记已处理，避免死循环
                // 如果是 null，exif_data 字段会通过 updateExifData 更新为 {} 或 null，
                // 但为了避免下次 getPendingExifItems 再次选出它，我们需要确保数据库状态改变
                // getPendingExifItems 选取的条件是: exif_data IS NULL OR (exif_data = '{}' AND latitude IS NULL)
                // 所以成功的会写入内容，失败的写入 {}。
                // 如果一直失败，我们需要一个机制防止它无限被选出... 
                // fix: updateExifData 会更新 updated_at，我们可以结合 updated_at 来过滤最近尝试过的？
                // 目前逻辑是：只要调了 updateExifData，就会更新 updated_at。
                // 但 getPendingExifItems 是按 created_at 排序的。
                // 建议：如果解析失败，写入一个特殊标记或者就是 {}。

                if (exifData) {
                    updateExifData(item.id, exifData)
                } else {
                    // 标记为失败，避免无限重试
                    // 数据库查询条件是 exif_data = '{}'，所以只有存入非空内容才能避免被再次选中
                    updateExifData(item.id, { _error: 'processing_failed' })
                }

                processed++

                if (processed % 10 === 0) console.log(`[EXIF] 批次进度: ${processed}/${pendingItems.length}`)

            } catch (error) {
                console.error(`[EXIF] 处理循环异常: ${item.path} - ${error}`)
                // 数据库层面记录错误? 目前 updateExifData 没地方记 error string
                // 暂时仅 log
            }
        }

        console.log(`EXIF 批量处理完成: 成功处理 ${processed} 个文件`)
        return processed
    } catch (error) {
        console.error('EXIF 批量处理出错:', error)
        return 0
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
