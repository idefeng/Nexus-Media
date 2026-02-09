/**
 * EXIF 元数据类型
 */
export interface ExifData {
    // 相机信息
    make?: string           // 相机品牌
    model?: string          // 相机型号
    software?: string       // 处理软件
    lensModel?: string      // 镜头型号
    serialNumber?: string   // 机身序列号

    // 拍摄参数
    focalLength?: number | string // 焦距 (mm) - Python returns string for some tags
    aperture?: number       // 光圈 (f/)
    exposureTime?: string   // 快门速度
    exposureBias?: number   // 曝光补偿
    iso?: number            // ISO 感光度
    flash?: string          // 闪光灯状态
    meteringMode?: string   // 测光模式
    exposureProgram?: string // 曝光程序
    whiteBalance?: string   // 白平衡

    // 时间
    dateTimeOriginal?: string   // 原始拍摄时间
    createDate?: string
    modifyDate?: string

    // GPS 信息
    latitude?: number       // 纬度
    longitude?: number      // 经度
    altitude?: number       // 海拔 (m)

    // 图像信息
    width?: number          // 原始宽度
    height?: number         // 原始高度
    orientation?: number    // 方向
    colorSpace?: string     // 色彩空间
    duration?: number       // 时长
    fileSize?: number
    mimeType?: string
    bitDepth?: number
}

/**
 * 媒体资源类型定义
 */
export interface MediaItem {
    id: number
    path: string
    type: 'image' | 'video'
    tags: string[]
    notes: string
    thumbnailPath: string | null
    fileName: string
    fileSize: number
    ext: string
    width: number | null
    height: number | null
    duration: number | null
    birthTime: string
    modifiedTime: string
    createdAt: string
    updatedAt: string
    isFavorite: boolean
    aiTags: string[]
    similarityScore?: number
    exifData?: ExifData
    latitude?: number | null
    longitude?: number | null
    country?: string | null
    province?: string | null
    city?: string | null
    district?: string | null
    locationName?: string | null
}

/**
 * 数据库记录类型（从 Electron 获取的原始数据）
 */
export interface MediaItemRecord {
    id: number
    path: string
    name: string
    size: number
    type: 'image' | 'video'
    ext: string
    birth_time: string
    modified_time: string
    tags: string
    notes: string
    thumbnail_path: string | null
    is_favorite: number
    created_at: string
    updated_at: string
    ai_tags: string | null
    exif_data: string | null
    width: number | null
    height: number | null
    duration: number | null
    latitude: number | null
    longitude: number | null
    country: string | null
    province: string | null
    city: string | null
    district: string | null
    location_name: string | null
}

/**
 * 将数据库记录转换为前端 MediaItem
 */
export function recordToMediaItem(record: MediaItemRecord): MediaItem {
    // 确保缩略图路径使用了自定义协议
    let thumbPath = record.thumbnail_path
    // 如果没有生成缩略图且是图片，直接使用原图
    if (!thumbPath && record.type === 'image') {
        thumbPath = record.path
    }

    if (thumbPath && !thumbPath.startsWith('nexus-media://')) {
        // 修复：确保路径中的反斜杠被正确处理
        const normalizedPath = thumbPath.replace(/\\/g, '/')
        thumbPath = `nexus-media://local/${normalizedPath}`
    }

    // 解析 EXIF 数据
    let exifData: ExifData | undefined
    if (record.exif_data) {
        try {
            const parsed = JSON.parse(record.exif_data)
            // 只有当解析结果有内容时才赋值
            if (Object.keys(parsed).length > 0) {
                exifData = parsed
            }
        } catch {
            // 忽略解析错误
        }
    }

    return {
        id: record.id,
        path: record.path,
        type: record.type,
        tags: JSON.parse(record.tags || '[]'),
        notes: record.notes || '',
        thumbnailPath: thumbPath,
        fileName: record.name,
        fileSize: record.size,
        ext: record.ext,
        width: record.width || exifData?.width || null,
        height: record.height || exifData?.height || null,
        duration: record.duration || null,
        birthTime: record.birth_time,
        modifiedTime: record.modified_time,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        isFavorite: record.is_favorite === 1,
        aiTags: JSON.parse(record.ai_tags || '[]'),
        exifData,
        latitude: record.latitude,
        longitude: record.longitude,
        country: record.country,
        province: record.province,
        city: record.city,
        district: record.district,
        locationName: record.location_name
    }
}

/**
 * 导航菜单项类型
 */
export interface NavItem {
    id: string
    label: string
    icon: string
    count?: number
}

/**
 * 标签统计类型
 */
export interface TagStat {
    name: string
    count: number
}

/**
 * 视图类型
 */
export type ViewType = 'dashboard' | 'all' | 'recent' | 'favorites' | 'settings' | 'cleanup' | 'studio' | 'people' | 'map'

/**
 * 扫描进度信息
 */
export interface ScanProgress {
    currentPath: string
    filesFound: number
    filesInserted: number
    newFiles: {
        path: string
        name: string
        type: 'image' | 'video'
        ext: string
        size: number
    }[]
}

/**
 * 扫描完成信息
 */
export interface ScanComplete {
    totalScanned: number
    stats: {
        images: number
        videos: number
        total: number
    }
}

/**
 * 媒体统计
 */
export interface MediaStats {
    images: number
    videos: number
    total: number
}
