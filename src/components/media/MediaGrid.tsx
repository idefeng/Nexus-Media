/**
 * 媒体网格组件
 * 响应式网格布局展示媒体资源，集成虚拟滚动、多选和右键菜单
 */
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image, Video, Inbox, CheckSquare, Users, Palette } from 'lucide-react'
import { VirtuosoGrid } from 'react-virtuoso'
import { MediaCard } from './MediaCard'
import { ContextMenu, createMediaContextMenuItems } from '../common/ContextMenu'
import { BulkActionBar } from '../gallery/BulkActionBar'
import type { MediaItem, ViewType } from '../../types'
import { usePreferences } from '../../contexts/PreferencesContext'


interface MediaGridProps {
    items: MediaItem[]
    currentView: ViewType
    selectedTag: string | null
    onFavoriteToggle: (id: number) => void
    onItemClick?: (item: MediaItem) => void
    onDeleteItem?: (id: number) => Promise<void>
    onBatchDelete?: (ids: number[]) => Promise<void>
    onBatchAddTags?: (ids: number[], tags: string[]) => Promise<void>
    onShare?: (ids: number[]) => Promise<void>
    onRefresh?: () => void
    allTags?: string[]
}

// 视图标题配置
const viewTitles: Record<ViewType, { title: string; icon: React.ReactNode }> = {
    all: { title: '所有媒体', icon: <Image className="w-5 h-5" /> },
    recent: { title: '最近添加', icon: <Video className="w-5 h-5" /> },
    favorites: { title: '收藏夹', icon: <Inbox className="w-5 h-5" /> },
    dashboard: { title: '仪表盘', icon: <Image className="w-5 h-5" /> },
    settings: { title: '设置', icon: <Inbox className="w-5 h-5" /> },
    cleanup: { title: '清理助手', icon: <Inbox className="w-5 h-5" /> },
    studio: { title: '创意工作室', icon: <Palette className="w-5 h-5" /> },
    people: { title: '人物与关系', icon: <Users className="w-5 h-5" /> }
}

export function MediaGrid({
    items,
    currentView,
    selectedTag,
    onFavoriteToggle,
    onItemClick,
    onDeleteItem,
    onBatchDelete,
    onBatchAddTags,
    onShare,
    onRefresh,
    allTags = []
}: MediaGridProps) {
    const { title } = viewTitles[currentView]
    const { preferences } = usePreferences()

    // 根据 gridSize 偏好设置网格列数
    const gridColsClass = {
        small: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10',
        medium: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
        large: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
    }[preferences.gridSize]

    // 多选状态
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)

    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean
        position: { x: number; y: number }
        item: MediaItem | null
    }>({
        isOpen: false,
        position: { x: 0, y: 0 },
        item: null
    })

    // 处理选择
    const handleSelect = useCallback((id: number, e: React.MouseEvent) => {
        const itemIndex = items.findIndex(item => item.id === id)

        setSelectedIds(prev => {
            const newSet = new Set(prev)

            if (e.shiftKey && lastSelectedIndex !== null) {
                // Shift+Click: 范围选择
                const start = Math.min(lastSelectedIndex, itemIndex)
                const end = Math.max(lastSelectedIndex, itemIndex)
                for (let i = start; i <= end; i++) {
                    newSet.add(items[i].id)
                }
            } else if (e.ctrlKey || e.metaKey) {
                // Ctrl/Cmd+Click: 切换选择
                if (newSet.has(id)) {
                    newSet.delete(id)
                } else {
                    newSet.add(id)
                }
            } else {
                // 普通点击在选择模式下
                if (isSelectionMode) {
                    if (newSet.has(id)) {
                        newSet.delete(id)
                    } else {
                        newSet.add(id)
                    }
                } else {
                    // 非选择模式下进入选择模式并选中当前项
                    setIsSelectionMode(true)
                    newSet.clear()
                    newSet.add(id)
                }
            }

            return newSet
        })

        setLastSelectedIndex(itemIndex)
    }, [items, lastSelectedIndex, isSelectionMode])

    // 清除选择
    const handleClearSelection = useCallback(() => {
        setSelectedIds(new Set())
        setIsSelectionMode(false)
        setLastSelectedIndex(null)
    }, [])

    // 切换选择模式
    const toggleSelectionMode = useCallback(() => {
        if (isSelectionMode) {
            handleClearSelection()
        } else {
            setIsSelectionMode(true)
        }
    }, [isSelectionMode, handleClearSelection])

    // 右键菜单
    const handleContextMenu = useCallback((e: React.MouseEvent, item: MediaItem) => {
        e.preventDefault()
        setContextMenu({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
            item
        })
    }, [])

    const closeContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, isOpen: false }))
    }, [])

    // 右键菜单操作
    const handleShowInExplorer = async () => {
        if (!contextMenu.item || !window.electronAPI) return
        await window.electronAPI.shell.showInExplorer(contextMenu.item.path)
    }

    const handleCopyPath = async () => {
        if (!contextMenu.item || !window.electronAPI) return
        await window.electronAPI.shell.copyPath(contextMenu.item.path)
    }

    const handleDeleteFromMenu = async () => {
        if (!contextMenu.item) return
        if (!confirm(`确定要删除 "${contextMenu.item.fileName}" 吗？\n文件将移至回收站。`)) return
        await onDeleteItem?.(contextMenu.item.id)
        onRefresh?.()
    }

    const handleToggleFavoriteFromMenu = () => {
        if (!contextMenu.item) return
        onFavoriteToggle(contextMenu.item.id)
    }

    const handleShareFromMenu = async () => {
        if (!contextMenu.item) return
        await onShare?.([contextMenu.item.id])
    }

    // 批量操作
    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return
        await onBatchDelete?.(Array.from(selectedIds))
        handleClearSelection()
        onRefresh?.()
    }

    const handleBatchAddTags = async (tags: string[]) => {
        if (selectedIds.size === 0) return
        await onBatchAddTags?.(Array.from(selectedIds), tags)
        onRefresh?.()
    }

    const handleBatchShare = async () => {
        if (selectedIds.size === 0) return
        await onShare?.(Array.from(selectedIds))
    }

    // 生成右键菜单项
    const menuItems = contextMenu.item ? createMediaContextMenuItems(
        contextMenu.item.path,
        contextMenu.item.isFavorite,
        {
            onShowInExplorer: handleShowInExplorer,
            onCopyPath: handleCopyPath,
            onToggleFavorite: handleToggleFavoriteFromMenu,
            onDelete: handleDeleteFromMenu,
            onShare: handleShareFromMenu
        }
    ) : []

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-nexus-bg">
            {/* 页面标题 (固定在顶部) */}
            <div className="p-6 pb-2">
                <motion.div
                    key={currentView + (selectedTag || '')}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-2"
                >
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="font-display text-2xl font-bold text-nexus-text-primary">
                            {selectedTag ? `#${selectedTag}` : title}
                        </h2>
                        <span className="text-sm text-nexus-text-muted">
                            {items.length} 个项目
                        </span>

                        {/* 选择模式切换按钮 */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleSelectionMode}
                            className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${isSelectionMode
                                ? 'bg-neon-cyan/10 text-neon-cyan'
                                : 'bg-gray-100 text-nexus-text-secondary hover:bg-gray-200'
                                }`}
                        >
                            <CheckSquare className="w-4 h-4" />
                            <span className="text-sm">{isSelectionMode ? '退出选择' : '多选'}</span>
                        </motion.button>
                    </div>
                    {selectedTag && (
                        <p className="text-nexus-text-secondary text-sm">
                            筛选标签: <span className="text-neon-cyan">{selectedTag}</span>
                        </p>
                    )}
                </motion.div>
            </div>

            {/* 虚拟化网格 */}
            <div className="flex-1 min-h-0">
                <AnimatePresence mode="wait">
                    {items.length > 0 ? (
                        <VirtuosoGrid
                            style={{ height: '100%', width: '100%' }}
                            data={items}
                            totalCount={items.length}
                            overscan={400}
                            listClassName={`grid ${gridColsClass} gap-4 p-6`}
                            itemContent={(index, item) => (
                                <MediaCard
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    onFavoriteToggle={onFavoriteToggle}
                                    onClick={() => !isSelectionMode && onItemClick?.(item)}
                                    onContextMenu={handleContextMenu}
                                    isSelected={selectedIds.has(item.id)}
                                    isSelectionMode={isSelectionMode}
                                    onSelect={handleSelect}
                                />
                            )}
                        />
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex flex-col items-center justify-center h-full"
                        >
                            <div className="w-24 h-24 rounded-full bg-nexus-bg-secondary flex items-center justify-center mb-6">
                                <Inbox className="w-10 h-10 text-nexus-text-muted" />
                            </div>
                            <h3 className="text-xl font-medium text-nexus-text-secondary mb-2">
                                暂无媒体资源
                            </h3>
                            <p className="text-nexus-text-muted text-sm">
                                点击上方「添加文件夹」导入您的媒体资源
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 底部装饰渐变 */}
            <div className="h-6 bg-gradient-to-t from-black/20 to-transparent pointer-events-none sticky bottom-0 z-10" />

            {/* 右键菜单 */}
            <ContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                items={menuItems}
                onClose={closeContextMenu}
            />

            {/* 批量操作工具栏 */}
            <BulkActionBar
                selectedCount={selectedIds.size}
                onAddTags={handleBatchAddTags}
                onDelete={handleBatchDelete}
                onShare={handleBatchShare}
                onClearSelection={handleClearSelection}
                allTags={allTags}
            />
        </div>
    )
}
