/// <reference types="vite/client" />

// 媒体项记录（从数据库返回）
interface MediaItemRecord {
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

// 扫描进度信息
interface ScanProgressInfo {
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

// 扫描完成信息
interface ScanCompleteInfo {
    totalScanned: number
    stats: {
        images: number
        videos: number
        total: number
    }
}

// Electron API 接口
interface Window {
    electronAPI: {
        window: {
            minimize: () => Promise<void>
            maximize: () => Promise<void>
            close: () => Promise<void>
        }
        dialog: {
            selectFolder: () => Promise<string[]>
        }
        scan: {
            folders: (folderPaths: string[]) => Promise<{
                success: boolean
                totalScanned?: number
                stats?: { images: number; videos: number; total: number }
                message?: string
            }>
            onProgress: (callback: (progress: ScanProgressInfo) => void) => () => void
            onComplete: (callback: (info: ScanCompleteInfo) => void) => () => void
        }
        media: {
            getAll: () => Promise<{ success: boolean; items: MediaItemRecord[]; message?: string }>
            getStats: () => Promise<{ success: boolean; stats: { images: number; videos: number; total: number }; count: number }>
            toggleFavorite: (id: number) => Promise<{ success: boolean }>
            updateTags: (id: number, tags: string[]) => Promise<{ success: boolean }>
            updateNotes: (id: number, notes: string) => Promise<{ success: boolean }>
            getAllTags: () => Promise<{ success: boolean; tags: string[] }>
            getItem: (id: number) => Promise<{ success: boolean; item: MediaItemRecord | null }>
        }
    }
}
