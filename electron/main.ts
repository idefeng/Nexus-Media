/**
 * Electron 主进程
 * 负责创建窗口、处理 IPC 通信、文件扫描和数据库操作
 */
import { app, BrowserWindow, ipcMain, dialog, protocol, net, shell, clipboard } from 'electron'
import path from 'path'
import { pathToFileURL } from 'url'
import {
    initDatabase, insertMediaItems, smartMergeFiles, getAllMediaItems, getMediaStats, getMediaCount,
    toggleFavorite, updateTags, updateNotes, getAllTags, getMediaItem, closeDatabase,
    updateAiTags, getPendingAiItems, deleteMediaItem, deleteMediaItems, batchAddTags,
    updateMd5Hash, updateFocusScore, getCleanupStats, getExactDuplicates, getLowQualityItems,
    getAllPersons, updatePersonName, getSocialGraphData, getSharedMedia, clearDatabase
} from './database'
import { scanFolders, type ScannedFile, type ScanProgress } from './scanner'
import { initThumbnailsDir, startThumbnailBatch } from './thumbnails'
import { startAiServer, stopAiServer, checkHealth, analyzeImage, semanticSearch, processBackgroundAnalysis, getAiStatus } from './ai-sidecar'
import { generateCollage } from './studio'
import { processMd5Batch, analyzeCleanup, detectSimilarInChunk, trashItems as trashMediaItems, detectBlurryImages } from './cleanup'
import { getItemsWithEmbedding } from './database'
import fs from 'fs-extra'
import type { AppConfig } from './config-store'

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
        try {
            const url = request.url.replace('nexus-media://local/', '')
            const decodedPath = decodeURIComponent(url)

            // 确保 Windows 路径的正确性
            // net.fetch 需要标准的 file:/// URL
            const fileUrl = pathToFileURL(decodedPath).toString()

            return net.fetch(fileUrl)
        } catch (error) {
            console.error('Protocol error:', error)
            return new Response('Not Found', { status: 404 })
        }
    })

    createWindow()

    // 初始化数据库
    initDatabase().then(() => {
        console.log('数据库初始化成功')
        // 初始化缩略图目录
        initThumbnailsDir()

        // 启动后台任务调度器 (每10秒检查一次)
        setInterval(async () => {
            const fs = require('fs')
            const path = require('path')
            fs.appendFileSync(path.join(process.cwd(), 'scheduler_log.txt'), `[${new Date().toISOString()}] Scheduler tick\n`)
            // 后台任务并行启动（各自内部有 isProcessing 锁）
            startThumbnailBatch()
            processBackgroundAnalysis()
            processMd5Batch()
        }, 10000)

        // 立即执行一次
        startThumbnailBatch()
        processBackgroundAnalysis()
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

        // 将结果同步到数据库 (使用智能合并)
        const { inserted, restored } = smartMergeFiles(results)
        console.log(`扫描完成: ${results.length} 个文件, 新增: ${inserted}, 恢复: ${restored}`)

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

ipcMain.handle('shell:shareFiles', async (_event, filePaths: string[]) => {
    try {
        if (process.platform === 'win32') {
            // Windows: 使用 PowerShell 将文件作为 CF_HDROP 复制到剪贴板，模拟"复制文件"操作
            // 这样用户可以直接在社交软件(微信/QQ/Discord)中粘贴

            // 需要添加 Add-Type 来加载 System.Windows.Forms
            const psScript = `
                Add-Type -AssemblyName System.Windows.Forms;
                $files = @(${filePaths.map(p => `'${p.replace(/'/g, "''")}'`).join(',')});
                $fileList = New-Object System.Collections.Specialized.StringCollection;
                foreach ($file in $files) {
                    if (Test-Path $file) {
                        [void]$fileList.Add($file);
                    }
                }
                if ($fileList.Count -gt 0) {
                    [System.Windows.Forms.Clipboard]::SetFileDropList($fileList);
                    Write-Output "SUCCESS";
                } else {
                    Write-Error "No valid files found";
                    exit 1;
                }
            `

            const { spawn } = require('child_process')
            const child = spawn('powershell', [
                '-NoProfile',
                '-NonInteractive',
                '-ExecutionPolicy', 'Bypass',
                '-Command', psScript
            ])

            let stdout = ''
            let stderr = ''

            child.stdout.on('data', (data: Buffer) => {
                stdout += data.toString()
            })

            child.stderr.on('data', (data: Buffer) => {
                stderr += data.toString()
            })

            return new Promise((resolve) => {
                child.on('close', (code: number) => {
                    if (code === 0 && stdout.includes('SUCCESS')) {
                        resolve({
                            success: true,
                            message: `已复制 ${filePaths.length} 个文件到剪贴板，可直接在社交软件中粘贴`
                        })
                    } else {
                        console.error('PowerShell stderr:', stderr)
                        resolve({
                            success: false,
                            error: stderr || '复制到剪贴板失败'
                        })
                    }
                })

                child.on('error', (err: Error) => {
                    resolve({
                        success: false,
                        error: `PowerShell 执行失败: ${err.message}`
                    })
                })
            })
        } else {
            // macOS / Linux: 即使不支持 Native Share, 至少可以复制路径
            clipboard.writeText(filePaths.join('\n'))
            return { success: true, message: '文件路径已复制到剪贴板' }
        }
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

// 数据库维护
ipcMain.handle('database:clear', async () => {
    try {
        clearDatabase()
        console.log('Database cleared completely.')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// 清理助手 - 基础分析
ipcMain.handle('cleanup:analyze', async () => {
    try {
        const result = analyzeCleanup()
        return { success: true, data: result }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// 清理助手 - 激进式相似度扫描
let isSimilarityScanning = false
ipcMain.on('cleanup:start-similarity-scan', async (event) => {
    if (isSimilarityScanning) return
    isSimilarityScanning = true

    try {
        const { getEmbeddingCount, getItemsWithEmbedding } = await import('./database')
        const total = getEmbeddingCount()
        const CHUNK_SIZE = 100

        console.log(`[Cleanup] 开始激进式扫描 (分页模式): 总计 ${total} 张, 批次大小 ${CHUNK_SIZE}`)

        for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
            const chunk = getItemsWithEmbedding(CHUNK_SIZE, offset)
            if (chunk.length === 0) break

            const groups = detectSimilarInChunk(chunk, 0.95)

            if (groups.length > 0) {
                event.sender.send('cleanup:similarity-results', {
                    processed: offset + chunk.length,
                    total,
                    groups
                })
            }

            await new Promise(resolve => setTimeout(resolve, 50))
        }

        console.log('[Cleanup] 激进式扫描完成')
    } catch (error) {
        console.error('[Cleanup] 扫描出错:', error)
    } finally {
        isSimilarityScanning = false
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

// ==================== Configuration Management ====================

// Get all configuration
ipcMain.handle('config:getAll', async () => {
    try {
        const { configStore } = await import('./config-store')
        return { success: true, data: configStore.store }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// Update configuration
ipcMain.handle('config:update', async (_event, updates: Partial<AppConfig>) => {
    try {
        const { configStore } = await import('./config-store')
        Object.entries(updates).forEach(([key, value]) => {
            configStore.set(key as keyof AppConfig, value as any)
        })
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// Select new database path
ipcMain.handle('config:selectDatabasePath', async () => {
    try {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: '选择数据库存储位置'
        })

        if (!result.canceled && result.filePaths[0]) {
            const newPath = path.join(result.filePaths[0], 'nexus_media.db')
            return { success: true, path: newPath }
        }
        return { success: false }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// Migrate database to new location
ipcMain.handle('config:migrateDatabase', async (_event, newPath: string, copyData: boolean) => {
    try {
        const { configStore } = await import('./config-store')
        const oldPath = configStore.get('database.path')

        // 如果选择复制数据且旧数据库存在
        if (copyData && await fs.pathExists(oldPath)) {
            // 确保目标目录存在
            await fs.ensureDir(path.dirname(newPath))
            // 复制数据库文件
            await fs.copy(oldPath, newPath, { overwrite: true })
            console.log(`Database migrated from ${oldPath} to ${newPath}`)
        }

        // 更新配置
        configStore.set('database.path', newPath)

        // 关闭旧数据库连接
        closeDatabase()

        // 重新初始化数据库（使用新路径）
        await initDatabase()

        return { success: true, message: '数据库迁移成功' }
    } catch (error: any) {
        console.error('Database migration failed:', error)
        return { success: false, error: error.message }
    }
})

// Get database size
ipcMain.handle('config:getDatabaseSize', async () => {
    try {
        const { configStore } = await import('./config-store')
        const dbPath = configStore.get('database.path')
        if (await fs.pathExists(dbPath)) {
            const stats = await fs.stat(dbPath)
            return { success: true, size: stats.size }
        }
        return { success: true, size: 0 }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// Add scan directory
ipcMain.handle('config:addScanDirectory', async (_event, dirPath: string) => {
    try {
        const { addScanDirectory } = await import('./config-store')
        const added = addScanDirectory(dirPath)
        return { success: true, added }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// Remove scan directory
ipcMain.handle('config:removeScanDirectory', async (_event, dirPath: string) => {
    try {
        const { removeScanDirectory } = await import('./config-store')
        const removed = removeScanDirectory(dirPath)
        return { success: true, removed }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// Update scan directory timestamp
ipcMain.handle('config:updateScanTimestamp', async (_event, dirPath: string) => {
    try {
        const { updateScanTimestamp } = await import('./config-store')
        const updated = updateScanTimestamp(dirPath)
        return { success: true, updated }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// Toggle AI features
ipcMain.handle('config:toggleAI', async (_event, enabled: boolean) => {
    try {
        const { configStore } = await import('./config-store')
        configStore.set('ai.enabled', enabled)

        if (!enabled) {
            // 停止 AI 服务器
            await stopAiServer()
        } else {
            // 启动 AI 服务器
            await startAiServer()
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// Toggle CUDA
ipcMain.handle('config:toggleCuda', async (_event, enabled: boolean) => {
    try {
        const { configStore } = await import('./config-store')
        configStore.set('ai.useCuda', enabled)
        // Note: CUDA setting will take effect on next AI server restart
        return { success: true, message: 'CUDA 设置将在下次启动 AI 服务时生效' }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
})

// Get app version
ipcMain.handle('config:getVersion', () => {
    return { success: true, version: app.getVersion() }
})

