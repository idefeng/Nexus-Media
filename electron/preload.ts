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
            // 返回清理函数
            return () => ipcRenderer.removeListener('scan:progress', handler)
        },
        onComplete: (callback: (info: ScanCompleteInfo) => void) => {
            const handler = (_event: Electron.IpcRendererEvent, info: ScanCompleteInfo) => callback(info)
            ipcRenderer.on('scan:complete', handler)
            // 返回清理函数
            return () => ipcRenderer.removeListener('scan:complete', handler)
        }
    },

    // 媒体操作
    media: {
        getAll: () => ipcRenderer.invoke('media:getAll') as Promise<{ success: boolean; items: MediaItemRecord[]; message?: string }>,
        getStats: () => ipcRenderer.invoke('media:getStats') as Promise<{ success: boolean; stats: { images: number; videos: number; total: number }; count: number }>,
        toggleFavorite: (id: number) => ipcRenderer.invoke('media:toggleFavorite', id) as Promise<{ success: boolean }>
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
            }
        }
    }
}
