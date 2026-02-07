/**
 * Electron 主进程
 * 负责创建窗口、处理 IPC 通信、文件扫描和数据库操作
 */
import { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, clipboard } from 'electron'
import path from 'path'
import { pathToFileURL } from 'url'
import {
    initDatabase, insertMediaItems, getAllMediaItems, getMediaStats, getMediaCount,
    toggleFavorite, updateTags, updateNotes, getAllTags, getMediaItem, closeDatabase,
    updateAiTags, getPendingAiItems, deleteMediaItem, deleteMediaItems, batchAddTags,
    updateMd5Hash, updateFocusScore, getCleanupStats, getExactDuplicates, getLowQualityItems,
    getAllPersons, updatePersonName, getSocialGraphData, getSharedMedia
} from './database'
import { scanFolders, type ScannedFile, type ScanProgress } from './scanner'
import { initThumbnailsDir, startThumbnailBatch } from './thumbnails'
import { startAiServer, stopAiServer, checkHealth, analyzeImage, semanticSearch, processBackgroundAnalysis, getAiStatus } from './ai-sidecar'
import { generateCollage } from './studio'
import { processMd5Batch, detectSimilarImages as getSimilarGroups, trashItems as trashMediaItems } from './cleanup'

// 注册自定义协议以加载本地文件
protocol.registerSchemesAsPrivileged([
    { scheme: 'nexus-media', privileges: { bypassCSP: true, standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

// 开发环境标识
const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

// 创建主窗口
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        backgroundColor: '#0a0a0f',
        titleBarStyle: 'hiddenInset',
        frame: false, // 无边框窗口
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true // 保持开启以增强安全性
        }
    })

    // 加载页面
    if (isDev) {
        if (process.env.VITE_DEV_SERVER_URL) {
            mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
        } else {
            mainWindow.loadURL('http://localhost:5173')
        }
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

// 应用启动
app.whenReady().then(() => {
    // 注册协议处理
    protocol.handle('nexus-media', (request) => {
        const url = request.url.replace('nexus-media://local/', '')
        const decodedPath = decodeURIComponent(url)
        return net.fetch(pathToFileURL(decodedPath).toString())
    })

    createWindow()

    // 初始化数据库
    initDatabase().then(() => {
        console.log('数据库初始化成功')
        // 初始化缩略图目录
        initThumbnailsDir()
        // 启动后台扫描任务
        startThumbnailBatch()
        // 启动后台分析任务
        processBackgroundAnalysis()
        // 启动 MD5 计算任务
        processMd5Batch()
    }).catch(err => {
        console.error('数据库初始化失败:', err)
    })

    // 启动 AI Server
    startAiServer()
})

// 所有窗口关闭时退出
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        stopAiServer()
        closeDatabase()
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

// ==================== IPC 处理器 ====================

// 窗口控制
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize()
    } else {
        mainWindow?.maximize()
    }
})
ipcMain.handle('window:close', () => mainWindow?.close())

// 对话框
ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'multiSelections']
    })
    return result.filePaths
})

// 文件扫描
ipcMain.handle('scan:folders', async (_event, folderPaths: string[]) => {
    try {
        const results = await scanFolders(folderPaths, (progress: ScanProgress) => {
            mainWindow?.webContents.send('scan:progress', progress)
        })

        // 将结果同步到数据库
        const count = insertMediaItems(results)

        const stats = getMediaStats()
        const info = {
            totalScanned: results.length,
            stats
        }

        mainWindow?.webContents.send('scan:complete', info)
        return { success: true, ...info }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
})

// 媒体操作
ipcMain.handle('media:getAll', async () => {
    try {
        const items = getAllMediaItems()
        return { success: true, items }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
})

ipcMain.handle('media:getStats', async () => {
    try {
        const stats = getMediaStats()
        const count = getMediaCount()
        return { success: true, stats, count }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
})

ipcMain.handle('media:toggleFavorite', async (_event, id: number) => {
    try {
        const success = toggleFavorite(id)
        return { success }
    } catch (error) {
        return { success: false }
    }
})

ipcMain.handle('media:updateTags', async (_event, id, tags) => {
    try {
        updateTags(id, tags)
        return { success: true }
    } catch (error) {
        return { success: false }
    }
})

ipcMain.handle('media:updateNotes', async (_event, id, notes) => {
    try {
        updateNotes(id, notes)
        return { success: true }
    } catch (error) {
        return { success: false }
    }
})

ipcMain.handle('media:getAllTags', async () => {
    try {
        const tags = getAllTags()
        return { success: true, tags }
    } catch (error) {
        return { success: false, tags: [] }
    }
})

ipcMain.handle('media:getItem', async (_event, id) => {
    try {
        const item = getMediaItem(id)
        return { success: true, item }
    } catch (error) {
        return { success: false, item: null }
    }
})

// AI 功能
ipcMain.handle('ai:getStatus', () => getAiStatus())

ipcMain.handle('ai:analyze', async (_event, imagePath) => {
    return await analyzeImage(imagePath)
})

ipcMain.handle('ai:semanticSearch', async (_event, query, limit) => {
    return await semanticSearch(query, limit)
})

ipcMain.handle('ai:adoptTag', async (_event, id, tag) => {
    try {
        const item = getMediaItem(id)
        if (!item) return { success: false, error: 'Item not found' }

        const tags = JSON.parse(item.tags || '[]')
        if (!tags.includes(tag)) {
            tags.push(tag)
            updateTags(id, tags)
        }
        return { success: true, tags }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// Shell 操作
ipcMain.handle('shell:showInExplorer', async (_event, filePath) => {
    try {
        shell.showItemInFolder(filePath)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('shell:copyPath', async (_event, filePath) => {
    try {
        clipboard.writeText(filePath)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// 批量操作
ipcMain.handle('media:batchDelete', async (_event, ids) => {
    return await trashMediaItems(ids)
})

ipcMain.handle('media:batchAddTags', async (_event, ids, tags) => {
    try {
        const count = batchAddTags(ids, tags)
        return { success: true, updated: count }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('media:delete', async (_event, id) => {
    return await trashMediaItems([id])
})

// 清理助手
ipcMain.handle('cleanup:analyze', async () => {
    try {
        const stats = getCleanupStats()
        const exactDuplicates = getExactDuplicates()
        const similarImages = await getSimilarGroups()
        const lowQualityItems = getLowQualityItems()

        return {
            success: true,
            data: {
                stats: {
                    ...stats,
                    similarGroups: similarImages.length,
                    similarFiles: similarImages.reduce((sum, g) => sum + g.items.length, 0),
                    potentialSavings: stats.duplicateSize + 0 // 这里可以增加更多估算
                },
                exactDuplicates,
                similarImages,
                lowQualityItems
            }
        }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('cleanup:getStats', async () => {
    try {
        const stats = getCleanupStats()
        return { success: true, data: stats }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('cleanup:trashItems', async (_event, ids) => {
    return await trashMediaItems(ids)
})

ipcMain.handle('cleanup:calculateFocusScore', async (_event, imagePath) => {
    try {
        const { detectBlurryImages } = await import('./cleanup')
        const result = await detectBlurryImages([imagePath])
        return { success: true, data: result[0] }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('studio:generateCollage', async (_event, options) => {
    return await generateCollage(options)
})

// 人物/社交圈层
ipcMain.handle('people:getAll', async () => {
    return getAllPersons()
})

ipcMain.handle('people:updateName', async (_event, id, name) => {
    updatePersonName(id, name)
    return { success: true }
})

ipcMain.handle('people:getGraph', async () => {
    return getSocialGraphData()
})

ipcMain.handle('people:getSharedMedia', async (_event, id1, id2) => {
    return getSharedMedia(id1, id2)
})
