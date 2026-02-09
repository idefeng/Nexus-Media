/**
 * Electron 预加载脚本
 * 将安全的 API 暴露给渲染进程
 */
import { contextBridge, ipcRenderer } from 'electron'

// 媒体文件信息接口（用于渲染进程）
interface MediaFileInfo {
    path: string
    name: string
    type: 'image' | 'video'
    ext: string
    size: number
}

// 扫描进度信息
interface ScanProgressInfo {
    currentPath: string
    filesFound: number
    filesInserted: number
    newFiles: MediaFileInfo[]
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

// 媒体项记录
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
    embedding: ArrayBuffer | null
    exif_data: string | null
    md5_hash: string | null
    focus_score: number | null
    latitude: number | null
    longitude: number | null
}

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 窗口控制
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close')
    },

    // 对话框
    dialog: {
        selectFolder: () => ipcRenderer.invoke('dialog:selectFolder') as Promise<string[]>
    },

    // 文件扫描
    scan: {
        folders: (folderPaths: string[]) => ipcRenderer.invoke('scan:folders', folderPaths),
        onProgress: (callback: (progress: ScanProgressInfo) => void) => {
            const handler = (_event: Electron.IpcRendererEvent, progress: ScanProgressInfo) => callback(progress)
            ipcRenderer.on('scan:progress', handler)
            return () => ipcRenderer.removeListener('scan:progress', handler)
        },
        onComplete: (callback: (info: ScanCompleteInfo) => void) => {
            const handler = (_event: Electron.IpcRendererEvent, info: ScanCompleteInfo) => callback(info)
            ipcRenderer.on('scan:complete', handler)
            return () => ipcRenderer.removeListener('scan:complete', handler)
        }
    },

    // 媒体操作
    media: {
        getAll: () => ipcRenderer.invoke('media:getAll') as Promise<{ success: boolean; items: MediaItemRecord[]; message?: string }>,
        getStats: () => ipcRenderer.invoke('media:getStats') as Promise<{ success: boolean; stats: { images: number; videos: number; total: number }; count: number }>,
        toggleFavorite: (id: number) => ipcRenderer.invoke('media:toggleFavorite', id) as Promise<{ success: boolean }>,
        updateTags: (id: number, tags: string[]) => ipcRenderer.invoke('media:updateTags', id, tags) as Promise<{ success: boolean }>,
        updateNotes: (id: number, notes: string) => ipcRenderer.invoke('media:updateNotes', id, notes) as Promise<{ success: boolean }>,
        getAllTags: () => ipcRenderer.invoke('media:getAllTags') as Promise<{ success: boolean; tags: string[] }>,
        getItem: (id: number) => ipcRenderer.invoke('media:getItem', id) as Promise<{ success: boolean; item: MediaItemRecord | null }>
    },

    // AI 功能
    ai: {
        getStatus: () => ipcRenderer.invoke('ai:getStatus') as Promise<{ running: boolean; ready: boolean; pendingCount: number }>,
        analyze: (imagePath: string) => ipcRenderer.invoke('ai:analyze', imagePath),
        semanticSearch: (query: string, limit?: number) => ipcRenderer.invoke('ai:semanticSearch', query, limit || 20),
        adoptTag: (id: number, tag: string) => ipcRenderer.invoke('ai:adoptTag', id, tag),
        start: () => ipcRenderer.invoke('ai:start'),
        toggleAuto: (enabled: boolean) => ipcRenderer.invoke('config:toggleAiAuto', enabled)
    },

    // EXIF 功能
    exif: {
        start: () => ipcRenderer.invoke('exif:start'),
        toggleAuto: (enabled: boolean) => ipcRenderer.invoke('config:toggleExifAuto', enabled)
    },

    // Shell 操作
    shell: {
        showInExplorer: (filePath: string) => ipcRenderer.invoke('shell:showInExplorer', filePath),
        copyPath: (filePath: string) => ipcRenderer.invoke('shell:copyPath', filePath),
        shareFiles: (filePaths: string[]) => ipcRenderer.invoke('shell:shareFiles', filePaths)
    },

    // 批量操作
    batch: {
        delete: (ids: number[]) => ipcRenderer.invoke('media:batchDelete', ids),
        addTags: (ids: number[], tags: string[]) => ipcRenderer.invoke('media:batchAddTags', ids, tags),
        deleteOne: (id: number) => ipcRenderer.invoke('media:delete', id)
    },

    // 清理助手
    cleanup: {
        analyze: () => ipcRenderer.invoke('cleanup:analyze'),
        getStats: () => ipcRenderer.invoke('cleanup:getStats'),
        trashItems: (ids: number[]) => ipcRenderer.invoke('cleanup:trashItems', ids),
        calculateFocusScore: (imagePath: string) => ipcRenderer.invoke('cleanup:calculateFocusScore', imagePath),
        clearDatabase: () => ipcRenderer.invoke('database:clear'),
        startSimilarityScan: () => ipcRenderer.send('cleanup:start-similarity-scan'),
        onSimilarityProgress: (callback: (data: { processed: number; total: number; groups: any[] }) => void) => {
            const listener = (_event: any, data: any) => callback(data)
            ipcRenderer.on('cleanup:similarity-results', listener)
            return () => ipcRenderer.removeListener('cleanup:similarity-results', listener)
        }
    },

    // 创意工作室
    studio: {
        generateCollage: (options: any) => ipcRenderer.invoke('studio:generateCollage', options)
    },

    // 人物/社交圈层
    people: {
        getAll: () => ipcRenderer.invoke('people:getAll'),
        updateName: (id: number, name: string) => ipcRenderer.invoke('people:updateName', id, name),
        getGraph: () => ipcRenderer.invoke('people:getGraph'),
        getSharedMedia: (personId1: number, personId2: number) => ipcRenderer.invoke('people:getSharedMedia', personId1, personId2)
    },

    // 配置管理
    config: {
        getAll: () => ipcRenderer.invoke('config:getAll'),
        update: (updates: any) => ipcRenderer.invoke('config:update', updates),
        selectDatabasePath: () => ipcRenderer.invoke('config:selectDatabasePath'),
        migrateDatabase: (newPath: string, copyData: boolean) => ipcRenderer.invoke('config:migrateDatabase', newPath, copyData),
        getDatabaseSize: () => ipcRenderer.invoke('config:getDatabaseSize'),
        addScanDirectory: (path: string) => ipcRenderer.invoke('config:addScanDirectory', path),
        removeScanDirectory: (path: string) => ipcRenderer.invoke('config:removeScanDirectory', path),
        updateScanTimestamp: (path: string) => ipcRenderer.invoke('config:updateScanTimestamp', path),
        toggleAI: (enabled: boolean) => ipcRenderer.invoke('config:toggleAI', enabled),
        toggleCuda: (enabled: boolean) => ipcRenderer.invoke('config:toggleCuda', enabled),
        getVersion: () => ipcRenderer.invoke('config:getVersion')
    },
    // 地图功能
    map: {
        getMedia: () => ipcRenderer.invoke('map:getMedia') as Promise<{ success: boolean; items: MediaItemRecord[] }>,
        searchByBounds: (bounds: { north: number; south: number; east: number; west: number }) =>
            ipcRenderer.invoke('map:searchByBounds', bounds) as Promise<{ success: boolean; items: MediaItemRecord[] }>
    },

    // 迁移助手
    migration: {
        scanDir: (folderPaths: string[]) => ipcRenderer.invoke('migration:scanDir', folderPaths),
        moveFile: (sourcePath: string, targetDir: string) => ipcRenderer.invoke('file:move', sourcePath, targetDir),
        analyzeSeed: (imagePath: string) => ipcRenderer.invoke('migration:analyzeSeed', imagePath),
        compareBatch: (seedData: any, targetPaths: string[], criteria: any) => ipcRenderer.invoke('migration:compareBatch', seedData, targetPaths, criteria),
        onProgress: (callback: (progress: any) => void) => {
            const subscription = (_: any, progress: any) => callback(progress)
            ipcRenderer.on('migration:scan-progress', subscription)
            return () => ipcRenderer.removeListener('migration:scan-progress', subscription)
        }
    }
})

// TypeScript 类型声明
declare global {
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
                folders: (folderPaths: string[]) => Promise<{ success: boolean; totalScanned?: number; stats?: any; message?: string }>
                onProgress: (callback: (progress: ScanProgressInfo) => void) => () => void
                onComplete: (callback: (info: ScanCompleteInfo) => void) => () => void
            }
            media: {
                getAll: () => Promise<{ success: boolean; items: MediaItemRecord[]; message?: string }>
                getStats: () => Promise<{ success: boolean; stats: any; count: number }>
                toggleFavorite: (id: number) => Promise<{ success: boolean }>
                updateTags: (id: number, tags: string[]) => Promise<{ success: boolean }>
                updateNotes: (id: number, notes: string) => Promise<{ success: boolean }>
                getAllTags: () => Promise<{ success: boolean; tags: string[] }>
                getItem: (id: number) => Promise<{ success: boolean; item: MediaItemRecord | null }>
            }
            ai: {
                getStatus: () => Promise<{ running: boolean; ready: boolean; pendingCount: number }>
                analyze: (imagePath: string) => Promise<any>
                semanticSearch: (query: string, limit?: number) => Promise<any>
                adoptTag: (id: number, tag: string) => Promise<any>
                start: () => Promise<any>
                toggleAuto: (enabled: boolean) => Promise<any>
            }
            exif: {
                start: () => Promise<any>
                toggleAuto: (enabled: boolean) => Promise<any>
            }
            shell: {
                showInExplorer: (filePath: string) => Promise<any>
                copyPath: (filePath: string) => Promise<any>
                shareFiles: (filePaths: string[]) => Promise<{ success: boolean; message?: string; error?: string }>
            }
            batch: {
                delete: (ids: number[]) => Promise<any>
                addTags: (ids: number[], tags: string[]) => Promise<any>
                deleteOne: (id: number) => Promise<any>
            }
            cleanup: {
                analyze: () => Promise<any>
                getStats: () => Promise<any>
                trashItems: (ids: number[]) => Promise<any>
                calculateFocusScore: (imagePath: string) => Promise<any>
                clearDatabase: () => Promise<{ success: boolean; error?: string }>
            }
            studio: {
                generateCollage: (options: {
                    type: 'text' | 'image'
                    prompt?: string
                    referenceIds?: number[]
                    style: 'compact' | 'masonry' | 'filmstrip'
                    backgroundColor: string
                    limit?: number
                }) => Promise<{
                    success: boolean
                    id?: number
                    path?: string
                    fileName?: string
                    count?: number
                    error?: string
                }>
            }
            people: {
                getAll: () => Promise<any[]>
                updateName: (id: number, name: string) => Promise<{ success: boolean }>
                getGraph: () => Promise<{ nodes: any[]; links: any[] }>
                getSharedMedia: (id1: number, id2: number) => Promise<any[]>
            }
            migration: {
                scanDir: (folderPaths: string[]) => Promise<{ success: boolean, files: any[] }>
                moveFile: (sourcePath: string, targetDir: string) => Promise<{ success: boolean, newPath?: string, error?: string }>
                analyzeSeed: (imagePath: string) => Promise<{ success: boolean, info?: any, raw_data?: any, error?: string }>
                compareBatch: (seedData: any, targetPaths: string[], criteria: any) => Promise<{ success: boolean, results?: any[], error?: string }>
            }
        }
    }
}
