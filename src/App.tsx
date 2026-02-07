/**
 * Nexus Media - 多媒体资源管理器
 * 主应用组件
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Dashboard } from './components/dashboard/Dashboard'
import { TopBar, Sidebar, StatusBar } from './components/layout'
import { MediaGrid } from './components/media'
import { SettingsPage } from './components/settings/SettingsPage'
import { CleanupDashboard } from './components/cleanup/CleanupDashboard'
import { StudioDashboard } from './components/studio/StudioDashboard'
import { PeoplePage } from './components/people/PeoplePage'
import { DetailModal } from './components/preview'
import { type FilterState, defaultFilterState } from './components/layout/FilterPanel'
import { recordToMediaItem, type ViewType, MediaItem, ScanProgress, TagStat, MediaItemRecord } from './types'
import { PreferencesProvider } from './contexts/PreferencesContext'



function App() {
    // 状态管理
    const [currentView, setCurrentView] = useState<ViewType>('dashboard')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
    const [isScanning, setIsScanning] = useState(false)
    const [scanStatus, setScanStatus] = useState<string>('')
    const [dbMediaCount, setDbMediaCount] = useState(0)
    const [aiQueueCount, setAiQueueCount] = useState(0)
    const [aiStatus, setAiStatus] = useState({ running: false, ready: false, pendingCount: 0 })

    // 预览 Modal 状态
    const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [allTags, setAllTags] = useState<string[]>([])

    // 高级筛选状态
    const [filters, setFilters] = useState<FilterState>(defaultFilterState)

    // 从数据库加载媒体项
    const loadMediaFromDB = useCallback(async () => {
        if (!window.electronAPI) return

        try {
            const result = await window.electronAPI.media.getAll()
            console.log('从数据库加载结果:', result)
            if (result.success && result.items) {
                // Use the fixed mapping function
                const items: MediaItem[] = (result.items as MediaItemRecord[]).map(recordToMediaItem)
                console.log('转换后的媒体项:', items)
                setMediaItems(items)
                setDbMediaCount(items.length)
            }
        } catch (error) {
            console.error('加载媒体项失败:', error)
        }
    }, [])

    // 加载所有标签（用于自动补全和标签云）
    const loadAllTags = useCallback(async () => {
        if (!window.electronAPI) return

        try {
            const result = await window.electronAPI.media.getAllTags()
            if (result.success) {
                setAllTags(result.tags)
            }
        } catch (error) {
            console.error('获取标签失败:', error)
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
        loadAllTags()
    }, [loadMediaFromDB, loadMediaStats, loadAllTags])

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
                            thumbnailPath: f.type === 'image' ? `nexus-media://local/${f.path.replace(/\\/g, '/')}` : null,
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
                            isFavorite: false,
                            aiTags: []
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
                loadAllTags()
                setScanStatus('')
            }, 2000)
        })

        return () => {
            cleanupProgress()
            cleanupComplete()
        }
    }, [loadMediaFromDB, loadAllTags])

    // 定期轮询 AI 状态和队列
    useEffect(() => {
        if (!window.electronAPI) return

        const fetchAiStatus = async () => {
            try {
                const status = await window.electronAPI.ai.getStatus()
                setAiStatus(status)
                setAiQueueCount(status.pendingCount)
            } catch (error) {
                console.error('获取 AI 状态失败:', error)
            }
        }

        fetchAiStatus()
        const interval = setInterval(fetchAiStatus, 5000)
        return () => clearInterval(interval)
    }, [])

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

        // 标签过滤 (快速标签选择)
        if (selectedTag) {
            items = items.filter(item => item.tags.includes(selectedTag) || item.aiTags.includes(selectedTag))
        }

        // === 高级过滤 ===

        // 日期范围过滤
        if (filters.dateRange.enabled) {
            if (filters.dateRange.start) {
                const startDate = new Date(filters.dateRange.start)
                items = items.filter(item => new Date(item.createdAt) >= startDate)
            }
            if (filters.dateRange.end) {
                const endDate = new Date(filters.dateRange.end)
                endDate.setHours(23, 59, 59, 999) // 包含结束日期整天
                items = items.filter(item => new Date(item.createdAt) <= endDate)
            }
        }

        // 文件类型过滤
        if (!filters.fileTypes.images && filters.fileTypes.videos) {
            items = items.filter(item => item.type === 'video')
        } else if (filters.fileTypes.images && !filters.fileTypes.videos) {
            items = items.filter(item => item.type === 'image')
        } else if (!filters.fileTypes.images && !filters.fileTypes.videos) {
            items = [] // 两者都未选中则无结果
        }

        // 标签组合过滤
        if (filters.tags.enabled && filters.tags.selected.length > 0) {
            if (filters.tags.logic === 'AND') {
                // AND: 必须包含所有选中标签
                items = items.filter(item =>
                    filters.tags.selected.every(tag => item.tags.includes(tag))
                )
            } else {
                // OR: 包含任一选中标签
                items = items.filter(item =>
                    filters.tags.selected.some(tag => item.tags.includes(tag))
                )
            }
        }

        // 文件大小过滤
        if (filters.fileSize.enabled) {
            items = items.filter(item =>
                item.fileSize >= filters.fileSize.min &&
                item.fileSize <= filters.fileSize.max
            )
        }

        // 搜索过滤 - 搜索文件名、标签、AI标签和备注
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            items = items.filter(item =>
                item.fileName.toLowerCase().includes(query) ||
                item.notes.toLowerCase().includes(query) ||
                item.tags.some(tag => tag.toLowerCase().includes(query)) ||
                item.aiTags.some(tag => tag.toLowerCase().includes(query))
            )
        }

        return items
    }, [mediaItems, currentView, selectedTag, searchQuery, filters])

    // 计算标签统计
    const tagStats = useMemo<TagStat[]>(() => {
        const tagCounts = new Map<string, number>()

        mediaItems.forEach(item => {
            item.tags.forEach(tag => {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
            })
            item.aiTags.forEach(tag => {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
            })
        })

        return Array.from(tagCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
    }, [mediaItems])

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

        // 更新预览项的收藏状态
        if (previewItem && previewItem.id === id) {
            setPreviewItem(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null)
        }

        // 同步到数据库
        if (window.electronAPI) {
            await window.electronAPI.media.toggleFavorite(id)
        }
    }

    // 更新标签
    const handleTagsChange = async (id: number, tags: string[]) => {
        // 更新本地状态
        setMediaItems(prev =>
            prev.map(item =>
                item.id === id
                    ? { ...item, tags }
                    : item
            )
        )

        // 更新预览项
        if (previewItem && previewItem.id === id) {
            setPreviewItem(prev => prev ? { ...prev, tags } : null)
        }

        // 同步到数据库
        if (window.electronAPI) {
            await window.electronAPI.media.updateTags(id, tags)
            // 刷新标签列表
            loadAllTags()
        }
    }

    // 更新备注
    const handleNotesChange = async (id: number, notes: string) => {
        // 更新本地状态
        setMediaItems(prev =>
            prev.map(item =>
                item.id === id
                    ? { ...item, notes }
                    : item
            )
        )

        // 更新预览项
        if (previewItem && previewItem.id === id) {
            setPreviewItem(prev => prev ? { ...prev, notes } : null)
        }

        // 同步到数据库
        if (window.electronAPI) {
            await window.electronAPI.media.updateNotes(id, notes)
        }
    }

    // 采纳 AI 建议标签
    const handleAdoptAiTag = async (id: number, tag: string) => {
        if (!window.electronAPI) return

        try {
            const result = await window.electronAPI.ai.adoptTag(id, tag)
            if (result.success && result.tags) {
                // 更新本地状态
                setMediaItems(prev =>
                    prev.map(item =>
                        item.id === id
                            ? { ...item, tags: result.tags! }
                            : item
                    )
                )

                // 更新预览项
                if (previewItem && previewItem.id === id) {
                    setPreviewItem(prev => prev ? { ...prev, tags: result.tags! } : null)
                }

                // 刷新标签列表
                loadAllTags()
            }
        } catch (error) {
            console.error('采纳 AI 标签失败:', error)
        }
    }

    // 打开预览
    const handleItemClick = (item: MediaItem) => {
        setPreviewItem(item)
        setIsPreviewOpen(true)
    }

    // 关闭预览
    const handlePreviewClose = () => {
        setIsPreviewOpen(false)
        // 延迟清除预览项以保持动画流畅
        setTimeout(() => setPreviewItem(null), 200)
    }

    // 预览导航
    const handlePreviewNavigate = (item: MediaItem) => {
        setPreviewItem(item)
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

    // 删除单个媒体项
    const handleDeleteItem = async (id: number) => {
        if (!window.electronAPI) return

        try {
            const result = await window.electronAPI.batch.deleteOne(id)
            if (result.success) {
                setMediaItems(prev => prev.filter(item => item.id !== id))
            }
        } catch (error) {
            console.error('删除失败:', error)
        }
    }

    // 批量删除
    const handleBatchDelete = async (ids: number[]) => {
        if (!window.electronAPI) return

        try {
            const result = await window.electronAPI.batch.delete(ids)
            if (result.success) {
                setMediaItems(prev => prev.filter(item => !ids.includes(item.id)))
            }
        } catch (error) {
            console.error('批量删除失败:', error)
        }
    }

    // 批量添加标签
    const handleBatchAddTags = async (ids: number[], tags: string[]) => {
        if (!window.electronAPI) return

        try {
            const result = await window.electronAPI.batch.addTags(ids, tags)
            if (result.success) {
                // 更新本地状态
                setMediaItems(prev => prev.map(item => {
                    if (ids.includes(item.id)) {
                        const newTags = Array.from(new Set([...item.tags, ...tags]))
                        return { ...item, tags: newTags }
                    }
                    return item
                }))
                // 刷新标签列表
                loadAllTags()
            }
        } catch (error) {
            console.error('批量添加标签失败:', error)
        }
    }

    // 分享功能
    const handleShare = async (itemsToShare: MediaItem[] | number[]) => {
        if (!window.electronAPI) return

        // 统一转换为路径数组
        let paths: string[] = []
        if (itemsToShare.length > 0) {
            if (typeof itemsToShare[0] === 'number') {
                // 如果是 ID 数组，从 mediaItems 中查找路径
                const ids = new Set(itemsToShare as number[])
                paths = mediaItems.filter(item => ids.has(item.id)).map(item => item.path)
            } else {
                // 如果是 MediaItem 对象数组
                paths = (itemsToShare as MediaItem[]).map(item => item.path)
            }
        }

        if (paths.length === 0) return

        try {
            // 首先尝试调用本地分享 (如果支持)
            const result = await window.electronAPI.shell.shareFiles(paths)

            if (result.success) {
                // 简单的 Toast 提示 (这里用 alert 代替，或者可以集成第三方 Toast 库)
                alert(result.message || '已复制到剪贴板，可直接在社交软件中粘贴')
            } else {
                console.error('分享失败:', result.error)
                alert('分享失败: ' + result.error)
            }
        } catch (error) {
            console.error('分享操作异常:', error)
            alert('分享操作异常')
        }
    }

    return (
        <PreferencesProvider>
            <div className="h-screen w-screen flex flex-col bg-nexus-bg overflow-hidden">
                {/* 顶部栏 */}
                <TopBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onAddFolder={handleAddFolder}
                    onRefresh={loadMediaFromDB}
                    isScanning={isScanning}
                    scanStatus={scanStatus}
                />

                {/* 主体区域 */}
                <div className="flex-1 flex overflow-hidden">
                    {/* 侧边栏 */}
                    <Sidebar
                        currentView={currentView}
                        onViewChange={setCurrentView}
                        tagStats={tagStats}
                        selectedTag={selectedTag}
                        onTagSelect={setSelectedTag}
                        mediaCount={mediaCount}
                        filters={filters}
                        onFiltersChange={setFilters}
                        availableTags={allTags}
                    />

                    {/* 媒体展示区 */}
                    <main className="flex-1 flex flex-col overflow-hidden bg-nexus-bg relative">
                        {currentView === 'dashboard' ? (
                            <Dashboard
                                mediaCount={mediaCount}
                                recentItems={mediaItems
                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                    .slice(0, 10)
                                }
                                onNavigate={setCurrentView}
                                onItemClick={handleItemClick}
                            />
                        ) : currentView === 'settings' ? (
                            <SettingsPage />
                        ) : currentView === 'cleanup' ? (
                            <CleanupDashboard />
                        ) : currentView === 'studio' ? (
                            <StudioDashboard />
                        ) : currentView === 'people' ? (
                            <PeoplePage />
                        ) : (
                            <MediaGrid
                                items={filteredItems}
                                currentView={currentView}
                                selectedTag={selectedTag}
                                onFavoriteToggle={handleFavoriteToggle}
                                onItemClick={handleItemClick}
                                onDeleteItem={handleDeleteItem}
                                onBatchDelete={handleBatchDelete}
                                onBatchAddTags={handleBatchAddTags}
                                onShare={handleShare}
                                onRefresh={loadMediaFromDB}
                                allTags={allTags}
                            />
                        )}
                    </main>
                </div>

                {/* 底部状态栏 */}
                <StatusBar
                    scanStatus={scanStatus}
                    isScanning={isScanning}
                    dbCount={dbMediaCount}
                    aiQueueCount={aiQueueCount}
                    aiStatus={aiStatus}
                />

                {/* 详情预览 Modal */}
                <DetailModal
                    isOpen={isPreviewOpen}
                    item={previewItem}
                    items={filteredItems}
                    allTags={allTags}
                    onClose={handlePreviewClose}
                    onNavigate={handlePreviewNavigate}
                    onTagsChange={handleTagsChange}
                    onNotesChange={handleNotesChange}
                    onFavoriteToggle={handleFavoriteToggle}
                    onAdoptAiTag={handleAdoptAiTag}
                    onDeleteItem={handleDeleteItem}
                    onShare={handleShare}
                />

                {/* 底部装饰 - 极简风格不需要强光晕，可以使用极淡的渐变背景或留白 */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-nexus-bg">
                    <div className="absolute top-0 right-0 w-full h-96 bg-gradient-to-b from-white to-transparent opacity-60" />
                </div>

            </div>
        </PreferencesProvider>
    )
}

export default App
