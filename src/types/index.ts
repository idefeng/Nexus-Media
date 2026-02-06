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
}

/**
 * 将数据库记录转换为前端 MediaItem
 */
export function recordToMediaItem(record: MediaItemRecord): MediaItem {
    return {
        id: record.id,
        path: record.path,
        type: record.type,
        tags: JSON.parse(record.tags || '[]'),
        notes: record.notes || '',
        thumbnailPath: record.thumbnail_path,
        fileName: record.name,
        fileSize: record.size,
        ext: record.ext,
        width: null,
        height: null,
        duration: null,
        birthTime: record.birth_time,
        modifiedTime: record.modified_time,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        isFavorite: record.is_favorite === 1
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
export type ViewType = 'all' | 'recent' | 'favorites'

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
