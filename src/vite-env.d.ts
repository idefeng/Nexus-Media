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
    ai_tags: string | null
    exif_data: string | null
    width: number | null
    height: number | null
    duration: number | null
    md5_hash: string | null
    focus_score: number | null
    latitude: number | null
    longitude: number | null
    country: string | null
    province: string | null
    city: string | null
    district: string | null
    location_name: string | null
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
            getGeoStats: () => Promise<{ success: boolean; stats: { countries: number; provinces: number; locations: number } }>
        }
        ai: {
            getStatus: () => Promise<{ running: boolean; ready: boolean; pendingCount: number }>
            analyze: (imagePath: string) => Promise<{
                success: boolean
                tags?: { name: string; confidence: number }[]
                embedding?: number[]
                error?: string
            }>
            semanticSearch: (query: string, limit?: number) => Promise<{
                success: boolean
                results?: { id: number; path: string; similarity: number }[]
                error?: string
            }>
            adoptTag: (id: number, tag: string) => Promise<{
                success: boolean
                tags?: string[]
                error?: string
            }>
        }
        shell: {
            showInExplorer: (filePath: string) => Promise<{ success: boolean; error?: string }>
            copyPath: (filePath: string) => Promise<{ success: boolean; error?: string }>
            shareFiles: (filePaths: string[]) => Promise<{ success: boolean; message?: string; error?: string }>
        }
        batch: {
            delete: (ids: number[]) => Promise<{ success: boolean; deleted?: number; error?: string }>
            addTags: (ids: number[], tags: string[]) => Promise<{ success: boolean; updated?: number; error?: string }>
            deleteOne: (id: number) => Promise<{ success: boolean; error?: string }>
        }
        cleanup: {
            analyze: () => Promise<{ success: boolean; data: any; error?: string }>
            getStats: () => Promise<{ success: boolean; data: any; error?: string }>
            trashItems: (ids: number[]) => Promise<{ success: boolean; successCount?: number; error?: string }>
            calculateFocusScore: (imagePath: string) => Promise<{ success: boolean; data: any; error?: string }>
            clearDatabase: () => Promise<{ success: boolean; error?: string }>
            startSimilarityScan: () => void
            onSimilarityProgress: (callback: (data: { processed: number; total: number; groups: any[] }) => void) => () => void
        }
        studio: {
            generateCollage: (options: any) => Promise<any>
        }
        people: {
            getAll: () => Promise<any[]>
            updateName: (id: number, name: string) => Promise<{ success: boolean }>
            getGraph: () => Promise<{ nodes: any[]; links: any[] }>
            getSharedMedia: (id1: number, id2: number) => Promise<any[]>
        }
        config: {
            getAll: () => Promise<{ success: boolean; data?: any; error?: string }>
            update: (updates: any) => Promise<{ success: boolean; error?: string }>
            selectDatabasePath: () => Promise<{ success: boolean; path?: string; error?: string }>
            migrateDatabase: (newPath: string, copyData: boolean) => Promise<{ success: boolean; message?: string; error?: string }>
            getDatabaseSize: () => Promise<{ success: boolean; size?: number; error?: string }>
            addScanDirectory: (path: string) => Promise<{ success: boolean; added?: boolean; error?: string }>
            removeScanDirectory: (path: string) => Promise<{ success: boolean; removed?: boolean; error?: string }>
            updateScanTimestamp: (path: string) => Promise<{ success: boolean; updated?: boolean; error?: string }>
            toggleAI: (enabled: boolean) => Promise<{ success: boolean; error?: string }>
            toggleCuda: (enabled: boolean) => Promise<{ success: boolean; message?: string; error?: string }>
            getVersion: () => Promise<{ success: boolean; version?: string }>
        }
        map: {
            getMedia: () => Promise<{ success: boolean; items: MediaItemRecord[] }>
            searchByBounds: (bounds: { north: number; south: number; east: number; west: number }) => Promise<{ success: boolean; items: MediaItemRecord[] }>
        }
        migration: {
            scanDir: (folderPaths: string[]) => Promise<{ success: boolean; files: any[] }>
            moveFile: (sourcePath: string, targetDir: string) => Promise<{ success: boolean; newPath?: string; error?: string }>
            analyzeSeed: (imagePath: string) => Promise<{ success: boolean; info?: any; raw_data?: any; error?: string }>
            compareBatch: (seedData: any, targetPaths: string[], criteria: any) => Promise<{ success: boolean; results?: any[]; error?: string }>
            onProgress: (callback: (progress: any) => void) => () => void
        }
        exif: {
            toggleAuto: (enabled: boolean) => Promise<any>
            start: () => Promise<{ success: boolean }>
        }
    }
}
