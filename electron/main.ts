/**
 * Electron 主进程
 * 负责创建窗口、处理 IPC 通信、文件扫描和数据库操作
 */
import { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, clipboard } from 'electron'
import path from 'path'
import { pathToFileURL } from 'url'
import { initDatabase, insertMediaItems, getAllMediaItems, getMediaStats, getMediaCount, toggleFavorite, updateTags, updateNotes, getAllTags, getMediaItem, closeDatabase, updateAiTags, getPendingAiItems, deleteMediaItem, deleteMediaItems, batchAddTags } from './database'
import { scanFolders, type ScannedFile, type ScanProgress } from './scanner'
import { initThumbnailsDir, startThumbnailBatch } from './thumbnails'
import { startAiServer, stopAiServer, checkHealth, analyzeImage, semanticSearch, processBackgroundAnalysis, getAiStatus } from './ai-sidecar'

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
        mainWindow.loadURL('http://localhost:5173')
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

// 应用初始化
app.whenReady().then(async () => {
    // 注册本地资源处理器
    protocol.handle('nexus-media', (request) => {
        try {
            // 使用 URL 对象解析，避免手动替换字符串导致的路径错误
            const url = new URL(request.url)
            // 路径通常在 hostname 之后，我们需要获取完整的路径部分
            // 格式约定为: nexus-media://local/C:/path/to/file
            let filePath = decodeURIComponent(url.pathname)

            // 在 Windows 上，pathname 可能会以 /C:/... 开头，需要去掉开头的斜杠
            if (filePath.startsWith('/') && filePath.length > 2 && filePath[1].match(/[a-zA-Z]/) && filePath[2] === ':') {
                filePath = filePath.substring(1)
            } else if (filePath.startsWith('/') && !filePath.includes(':')) {
                // 非 Windows 绝对路径或者相对路径处理
                // 这里假设是绝对路径，如果不是 Windows 盘符开头
            }

            // 使用 pathToFileURL 转换为标准的 file:// 协议，处理跨平台差异
            const fileUrl = pathToFileURL(filePath).toString()
            return net.fetch(fileUrl)
        } catch (error) {
            console.error('协议处理失败:', error)
            return new Response('Invalid path', { status: 400 })
        }
    })

    // 初始化数据库
    try {
        await initDatabase()
        console.log('数据库初始化成功')
    } catch (error) {
        console.error('数据库初始化失败:', error)
    }

    // 初始化缩略图目录
    initThumbnailsDir()

    // 启动 AI 服务（后台）
    startAiServer().then(ready => {
        if (ready) {
            console.log('AI 服务已启动')
            // 启动后台 AI 分析任务（每 30 秒检查一次）
            setInterval(() => {
                processBackgroundAnalysis().catch(err => console.error('后台 AI 分析错误:', err))
            }, 30000)
        } else {
            console.log('AI 服务启动失败，将以无 AI 模式运行')
        }
    })

    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    stopAiServer()
    closeDatabase()
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// ==================== IPC 处理器 ====================

// 窗口控制
ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
})

ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize()
    } else {
        mainWindow?.maximize()
    }
})

ipcMain.handle('window:close', () => {
    mainWindow?.close()
})

// 选择文件夹（支持多选）
ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory', 'multiSelections'],
        title: '选择要扫描的文件夹'
    })
    return result.filePaths
})

// 扫描选中的文件夹
ipcMain.handle('scan:folders', async (_event, folderPaths: string[]) => {
    if (!folderPaths || folderPaths.length === 0) {
        return { success: false, message: '未选择文件夹' }
    }

    console.log('开始扫描文件夹:', folderPaths)

    try {
        // 扫描进度回调
        const onProgress = (progress: ScanProgress) => {
            // 将新文件插入数据库
            const insertedCount = insertMediaItems(progress.newFiles)

            // 发送进度到渲染进程
            mainWindow?.webContents.send('scan:progress', {
                currentPath: progress.currentPath,
                filesFound: progress.filesFound,
                filesInserted: insertedCount,
                newFiles: progress.newFiles.map(f => ({
                    path: f.path,
                    name: f.name,
                    type: f.type,
                    ext: f.ext,
                    size: f.size
                }))
            })
        }

        // 执行扫描
        const allFiles = await scanFolders(folderPaths, onProgress, 30)

        // 启动后台缩略图生成任务
        startThumbnailBatch()

        // 获取最终统计
        const stats = getMediaStats()

        // 通知扫描完成
        mainWindow?.webContents.send('scan:complete', {
            totalScanned: allFiles.length,
            stats: stats
        })

        return {
            success: true,
            totalScanned: allFiles.length,
            stats: stats
        }
    } catch (error) {
        console.error('扫描失败:', error)
        return {
            success: false,
            message: error instanceof Error ? error.message : '扫描失败'
        }
    }
})

// 获取所有媒体项
ipcMain.handle('media:getAll', () => {
    try {
        const items = getAllMediaItems()
        return { success: true, items }
    } catch (error) {
        console.error('获取媒体项失败:', error)
        return { success: false, items: [], message: error instanceof Error ? error.message : '获取失败' }
    }
})

// 获取媒体统计
ipcMain.handle('media:getStats', () => {
    try {
        const stats = getMediaStats()
        const count = getMediaCount()
        return { success: true, stats, count }
    } catch (error) {
        console.error('获取统计失败:', error)
        return { success: false, stats: { images: 0, videos: 0, total: 0 }, count: 0 }
    }
})

// 切换收藏状态
ipcMain.handle('media:toggleFavorite', (_event, id: number) => {
    try {
        const success = toggleFavorite(id)
        return { success }
    } catch (error) {
        console.error('切换收藏状态失败:', error)
        return { success: false }
    }
})

// 更新标签
ipcMain.handle('media:updateTags', (_event, id: number, tags: string[]) => {
    try {
        updateTags(id, tags)
        return { success: true }
    } catch (error) {
        console.error('更新标签失败:', error)
        return { success: false }
    }
})

// 更新备注
ipcMain.handle('media:updateNotes', (_event, id: number, notes: string) => {
    try {
        updateNotes(id, notes)
        return { success: true }
    } catch (error) {
        console.error('更新备注失败:', error)
        return { success: false }
    }
})

// 获取所有标签（用于自动补全）
ipcMain.handle('media:getAllTags', () => {
    try {
        const tags = getAllTags()
        return { success: true, tags }
    } catch (error) {
        console.error('获取标签失败:', error)
        return { success: false, tags: [] }
    }
})

// 获取单个媒体项
ipcMain.handle('media:getItem', (_event, id: number) => {
    try {
        const item = getMediaItem(id)
        return { success: true, item }
    } catch (error) {
        console.error('获取媒体项失败:', error)
        return { success: false, item: null }
    }
})

// ==================== AI 相关 IPC 处理器 ====================

// 获取 AI 服务状态
ipcMain.handle('ai:getStatus', () => {
    return getAiStatus()
})

// 分析单张图片
ipcMain.handle('ai:analyze', async (_event, imagePath: string) => {
    try {
        const result = await analyzeImage(imagePath)
        return result
    } catch (error) {
        console.error('AI 分析失败:', error)
        return { success: false, error: String(error) }
    }
})

// 语义搜索
ipcMain.handle('ai:semanticSearch', async (_event, query: string, limit: number = 20) => {
    try {
        const result = await semanticSearch(query, limit)
        return result
    } catch (error) {
        console.error('语义搜索失败:', error)
        return { success: false, error: String(error) }
    }
})

// 采纳 AI 建议标签
ipcMain.handle('ai:adoptTag', (_event, id: number, tag: string) => {
    try {
        // 获取当前标签
        const item = getMediaItem(id)
        if (!item) return { success: false, error: '媒体项不存在' }

        const currentTags: string[] = JSON.parse(item.tags || '[]')
        if (!currentTags.includes(tag)) {
            currentTags.push(tag)
            updateTags(id, currentTags)
        }
        return { success: true, tags: currentTags }
    } catch (error) {
        console.error('采纳标签失败:', error)
        return { success: false, error: String(error) }
    }
})

// ==================== Shell 相关 IPC 处理器 ====================

// 在资源管理器中显示文件
ipcMain.handle('shell:showInExplorer', (_event, filePath: string) => {
    try {
        shell.showItemInFolder(filePath)
        return { success: true }
    } catch (error) {
        console.error('打开资源管理器失败:', error)
        return { success: false, error: String(error) }
    }
})

// 复制路径到剪贴板
ipcMain.handle('shell:copyPath', (_event, filePath: string) => {
    try {
        clipboard.writeText(filePath)
        return { success: true }
    } catch (error) {
        console.error('复制路径失败:', error)
        return { success: false, error: String(error) }
    }
})

// 删除单个媒体项（移至回收站并从数据库删除）
ipcMain.handle('media:delete', async (_event, id: number) => {
    try {
        const item = getMediaItem(id)
        if (!item) return { success: false, error: '媒体项不存在' }

        // 移动文件到回收站
        await shell.trashItem(item.path)

        // 从数据库删除
        deleteMediaItem(id)

        return { success: true }
    } catch (error) {
        console.error('删除媒体项失败:', error)
        return { success: false, error: String(error) }
    }
})

// 批量删除媒体项
ipcMain.handle('media:batchDelete', async (_event, ids: number[]) => {
    try {
        let deletedCount = 0
        for (const id of ids) {
            const item = getMediaItem(id)
            if (item) {
                try {
                    await shell.trashItem(item.path)
                    deletedCount++
                } catch (e) {
                    console.error(`移动文件到回收站失败: ${item.path}`, e)
                }
            }
        }

        // 从数据库批量删除
        const dbDeleted = deleteMediaItems(ids)

        return { success: true, deleted: deletedCount, dbDeleted }
    } catch (error) {
        console.error('批量删除失败:', error)
        return { success: false, error: String(error) }
    }
})

// 批量添加标签
ipcMain.handle('media:batchAddTags', (_event, ids: number[], tags: string[]) => {
    try {
        const updated = batchAddTags(ids, tags)
        return { success: true, updated }
    } catch (error) {
        console.error('批量添加标签失败:', error)
        return { success: false, error: String(error) }
    }
})
