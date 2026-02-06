/// <reference types="vite/client" />

// Electron API 类型声明
interface MediaItem {
    id: number
    path: string
    type: 'image' | 'video'
    tags: string
    notes: string
    thumbnail_path: string | null
    file_name: string
    file_size: number
    width: number | null
    height: number | null
    duration: number | null
    created_at: string
    updated_at: string
    is_favorite: number
}

interface Window {
    electronAPI: {
        window: {
            minimize: () => Promise<void>
            maximize: () => Promise<void>
            close: () => Promise<void>
        }
        dialog: {
            selectFolder: () => Promise<string | null>
        }
        database: {
            getMediaItems: (filters?: { type?: string; favorite?: boolean }) => Promise<MediaItem[]>
            addMediaItem: (item: {
                path: string
                type: 'image' | 'video'
                fileName: string
                fileSize?: number
                tags?: string[]
            }) => Promise<number | null>
            toggleFavorite: (id: number) => Promise<boolean>
            updateTags: (id: number, tags: string[]) => Promise<boolean>
            deleteMediaItem: (id: number) => Promise<boolean>
            getAllTags: () => Promise<string[]>
        }
    }
}
