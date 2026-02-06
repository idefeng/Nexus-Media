/**
 * Nexus Media - 多媒体资源管理器
 * 主应用组件
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { TopBar, Sidebar } from './components/layout'
import { MediaGrid } from './components/media'
import { mockTagStats } from './data/mockData'
import { recordToMediaItem } from './types'
import type { ViewType, MediaItem, ScanProgress } from './types'

function App() {
    // 状态管理
    const [currentView, setCurrentView] = useState<ViewType>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
    const [isScanning, setIsScanning] = useState(false)
    const [scanStatus, setScanStatus] = useState<string>('')
    const [dbMediaCount, setDbMediaCount] = useState(0)

    // 从数据库加载媒体项
    const loadMediaFromDB = useCallback(async () => {
        if (!window.electronAPI) return

        try {
            const result = await window.electronAPI.media.getAll()
            console.log('从数据库加载结果:', result)
            if (result.success && result.items) {
                const items: MediaItem[] = result.items.map(recordToMediaItem)
                console.log('转换后的媒体项:', items)
                setMediaItems(items)
                setDbMediaCount(items.length)
            }
        } catch (error) {
            console.error('加载媒体项失败:', error)
        }
    }, [])

    // 获取数据库中的媒体数量
    const loadMediaStats = useCallback(async () => {
        if (!window.electronAPI) return

        try {
            const result = await window.electronAPI.media.getStats()
            if (result.success) {
                setDbMediaCount(result.count)
            }
        } catch (error) {
            console.error('获取统计失败:', error)
        }
    }, [])

    // 初始化时加载数据
    useEffect(() => {
        loadMediaFromDB()
        loadMediaStats()
    }, [loadMediaFromDB, loadMediaStats])

    // 监听扫描进度
    useEffect(() => {
        if (!window.electronAPI) return

        // 监听扫描进度
        const cleanupProgress = window.electronAPI.scan.onProgress((progress: ScanProgress) => {
            console.log('收到扫描进度:', progress)
            setScanStatus(`正在扫描: ${progress.currentPath}\n已发现 ${progress.filesFound} 个文件`)

            // 实时添加新发现的文件到列表
            if (progress.newFiles && progress.newFiles.length > 0) {
                setMediaItems(prev => {
                    const existingPaths = new Set(prev.map(item => item.path))
                    const newItems: MediaItem[] = progress.newFiles
                        .filter(f => !existingPaths.has(f.path))
                        .map((f, index) => ({
                            id: Date.now() + index, // 临时 ID
                            path: f.path,
                            type: f.type,
                            tags: [],
                            notes: '',
                            thumbnailPath: f.type === 'image' ? `nexus-media://local/${f.path}` : null,
                            fileName: f.name,
                            fileSize: f.size,
                            ext: f.ext,
                            width: null,
                            height: null,
                            duration: null,
                            birthTime: new Date().toISOString(),
                            modifiedTime: new Date().toISOString(),
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            isFavorite: false
                        }))
                    return [...prev, ...newItems]
                })
            }
        })

        // 监听扫描完成
        const cleanupComplete = window.electronAPI.scan.onComplete((info) => {
            setScanStatus(`扫描完成！共扫描 ${info.totalScanned} 个文件`)
            setIsScanning(false)
            setDbMediaCount(info.stats.total)

            // 重新从数据库加载以获取正确的 ID
            setTimeout(() => {
                loadMediaFromDB()
                setScanStatus('')
            }, 2000)
        })

        return () => {
            cleanupProgress()
            cleanupComplete()
        }
    }, [loadMediaFromDB])

    // 过滤和搜索媒体
    const filteredItems = useMemo(() => {
        let items = [...mediaItems]

        // 视图过滤
        if (currentView === 'favorites') {
            items = items.filter(item => item.isFavorite)
        } else if (currentView === 'recent') {
            // 最近7天添加的
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            items = items.filter(item => new Date(item.createdAt) > sevenDaysAgo)
        }

        // 标签过滤
        if (selectedTag) {
            items = items.filter(item => item.tags.includes(selectedTag))
        }

        // 搜索过滤
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            items = items.filter(item =>
                item.fileName.toLowerCase().includes(query) ||
                item.notes.toLowerCase().includes(query) ||
                item.tags.some(tag => tag.toLowerCase().includes(query))
            )
        }

        return items
    }, [mediaItems, currentView, selectedTag, searchQuery])

    // 媒体统计
    const mediaCount = useMemo(() => {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        return {
            all: dbMediaCount, // 使用数据库中的实际数量
            recent: mediaItems.filter(item => new Date(item.createdAt) > sevenDaysAgo).length,
            favorites: mediaItems.filter(item => item.isFavorite).length,
            images: mediaItems.filter(item => item.type === 'image').length,
            videos: mediaItems.filter(item => item.type === 'video').length
        }
    }, [mediaItems, dbMediaCount])

    // 切换收藏状态
    const handleFavoriteToggle = async (id: number) => {
        // 先更新本地状态
        setMediaItems(prev =>
            prev.map(item =>
                item.id === id
                    ? { ...item, isFavorite: !item.isFavorite }
                    : item
            )
        )

        // 同步到数据库
        if (window.electronAPI) {
            await window.electronAPI.media.toggleFavorite(id)
        }
    }

    // 添加文件夹
    const handleAddFolder = async () => {
        // 在 Electron 环境中调用对话框
        if (window.electronAPI) {
            const folderPaths = await window.electronAPI.dialog.selectFolder()
            if (folderPaths && folderPaths.length > 0) {
                console.log('选择的文件夹:', folderPaths)
                setIsScanning(true)
                setScanStatus('准备扫描...')

                // 开始扫描
                const result = await window.electronAPI.scan.folders(folderPaths)

                if (!result.success) {
                    setScanStatus(`扫描失败: ${result.message}`)
                    setIsScanning(false)
                }
            }
        } else {
            // 在浏览器环境中提示
            alert('请在 Electron 应用中使用此功能')
        }
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-nexus-bg overflow-hidden">
            {/* 顶部栏 */}
            <TopBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onAddFolder={handleAddFolder}
                isScanning={isScanning}
                scanStatus={scanStatus}
            />

            {/* 主体区域 */}
            <div className="flex-1 flex overflow-hidden">
                {/* 侧边栏 */}
                <Sidebar
                    currentView={currentView}
                    onViewChange={setCurrentView}
                    tagStats={mockTagStats}
                    selectedTag={selectedTag}
                    onTagSelect={setSelectedTag}
                    mediaCount={mediaCount}
                />

                {/* 媒体展示区 */}
                <main className="flex-1 flex flex-col overflow-hidden bg-nexus-bg">
                    <MediaGrid
                        items={filteredItems}
                        currentView={currentView}
                        selectedTag={selectedTag}
                        onFavoriteToggle={handleFavoriteToggle}
                    />
                </main>
            </div>

            {/* 背景装饰效果 */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {/* 顶部渐变光晕 */}
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl" />
                <div className="absolute -top-40 left-1/3 w-80 h-80 bg-neon-purple/10 rounded-full blur-3xl" />
                {/* 底部渐变光晕 */}
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-neon-purple/8 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 right-1/4 w-72 h-72 bg-neon-green/5 rounded-full blur-3xl" />
            </div>
        </div>
    )
}

export default App
