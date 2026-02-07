/**
 * 详情预览 Modal
 * 全屏浮层，展示媒体文件预览和元数据编辑
 */
import { useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Heart, Trash2 } from 'lucide-react'
import { ImageViewer } from './ImageViewer'
import { VideoPlayer } from './VideoPlayer'
import { MetadataSidebar } from './MetadataSidebar'
import type { MediaItem } from '../../types'

interface DetailModalProps {
    isOpen: boolean
    item: MediaItem | null
    items: MediaItem[]  // 当前列表，用于导航
    allTags: string[]
    onClose: () => void
    onNavigate: (item: MediaItem) => void
    onTagsChange: (id: number, tags: string[]) => void
    onNotesChange: (id: number, notes: string) => void
    onFavoriteToggle: (id: number) => void
    onAdoptAiTag?: (id: number, tag: string) => void
    onDeleteItem?: (id: number) => Promise<void>
    onShare?: (items: MediaItem[]) => void
}

export function DetailModal({
    isOpen,
    item,
    items,
    allTags,
    onClose,
    onNavigate,
    onTagsChange,
    onNotesChange,
    onFavoriteToggle,
    onAdoptAiTag,
    onDeleteItem,
    onShare
}: DetailModalProps) {
    // 当前索引
    const currentIndex = useMemo(() => {
        if (!item) return -1
        return items.findIndex(i => i.id === item.id)
    }, [item, items])

    // 是否有上一个/下一个
    const hasPrev = currentIndex > 0
    const hasNext = currentIndex < items.length - 1

    // 导航到上一个
    const goToPrev = useCallback(() => {
        if (hasPrev) {
            onNavigate(items[currentIndex - 1])
        }
    }, [hasPrev, items, currentIndex, onNavigate])

    // 导航到下一个
    const goToNext = useCallback(() => {
        if (hasNext) {
            onNavigate(items[currentIndex + 1])
        }
    }, [hasNext, items, currentIndex, onNavigate])

    // 处理删除项目
    const handleDelete = useCallback(async () => {
        if (!item || !onDeleteItem) return;

        // 简单的确认对话框
        if (!confirm('确定要从图库中删除此文件吗？此操作不可撤销。')) return;

        try {
            const idToDelete = item.id;

            // 如果有下一个，先跳转到下一个，否则尝试跳转到上一个
            if (hasNext) {
                goToNext();
            } else if (hasPrev) {
                goToPrev();
            } else {
                onClose();
            }

            // 执行实际删除逻辑
            await onDeleteItem(idToDelete);
        } catch (error) {
            console.error('删除操作失败:', error);
        }
    }, [item, onDeleteItem, hasNext, hasPrev, goToNext, goToPrev, onClose])

    // 键盘快捷键
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    onClose()
                    break
                case 'ArrowLeft':
                    goToPrev()
                    break
                case 'ArrowRight':
                    goToNext()
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose, goToPrev, goToNext])

    // 禁止背景滚动
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    // 获取媒体源 URL
    const getMediaSrc = useCallback((mediaItem: MediaItem) => {
        return `nexus-media://local/${mediaItem.path}`
    }, [])

    if (!item) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex bg-black/95"
                >
                    {/* 左侧预览区域容器 */}
                    <div className="flex-1 relative flex flex-col h-full overflow-hidden">
                        {/* 顶部信息栏 */}
                        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
                            {/* 计数器 */}
                            <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                                <span className="text-white text-sm">
                                    {currentIndex + 1} / {items.length}
                                </span>
                            </div>
                        </div>

                        {/* 左侧导航按钮 */}
                        {hasPrev && (
                            <button
                                onClick={goToPrev}
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                title="上一个 (←)"
                            >
                                <ChevronLeft className="w-8 h-8 text-white" />
                            </button>
                        )}

                        {/* 右侧导航按钮 */}
                        {hasNext && (
                            <button
                                onClick={goToNext}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                title="下一个 (→)"
                            >
                                <ChevronRight className="w-8 h-8 text-white" />
                            </button>
                        )}

                        {/* 主内容区域 */}
                        <div
                            className="flex-1 flex items-center justify-center p-8 pb-20 w-full h-full"
                            onClick={(e) => {
                                // 点击背景关闭，但忽略内容区域的点击
                                if (e.target === e.currentTarget) {
                                    onClose();
                                }
                            }}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full"
                                >
                                    {item.type === 'image' ? (
                                        <ImageViewer
                                            src={getMediaSrc(item)}
                                            alt={item.fileName}
                                        />
                                    ) : (
                                        <VideoPlayer
                                            src={getMediaSrc(item)}
                                            poster={item.thumbnailPath || undefined}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* 底部工具栏 - 删除、收藏、关闭 */}
                        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-6 p-4 bg-gradient-to-t from-black/60 to-transparent">
                            {/* 删除按钮 */}
                            {onDeleteItem && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete();
                                    }}
                                    className="p-3 rounded-full bg-white/10 hover:bg-red-500/30 transition-colors group"
                                    title="从图库中删除"
                                >
                                    <Trash2 className="w-6 h-6 text-white group-hover:text-red-400" />
                                </button>
                            )}

                            {/* 收藏按钮 */}
                            <button
                                onClick={() => onFavoriteToggle(item.id)}
                                className={`p-3 rounded-full transition-colors ${item.isFavorite
                                    ? 'bg-neon-pink/30 hover:bg-neon-pink/40'
                                    : 'bg-white/10 hover:bg-white/20'
                                    }`}
                                title={item.isFavorite ? '取消收藏' : '添加收藏'}
                            >
                                <Heart className={`w-6 h-6 ${item.isFavorite ? 'text-neon-pink fill-neon-pink' : 'text-white'
                                    }`} />
                            </button>

                            {/* 关闭按钮 */}
                            <button
                                onClick={onClose}
                                className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                title="关闭 (ESC)"
                            >
                                <X className="w-6 h-6 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* 元数据侧边栏 */}
                    <MetadataSidebar
                        item={item}
                        allTags={allTags}
                        onTagsChange={(tags) => onTagsChange(item.id, tags)}
                        onNotesChange={(notes) => onNotesChange(item.id, notes)}
                        onAdoptAiTag={onAdoptAiTag ? (tag) => onAdoptAiTag(item.id, tag) : undefined}
                        onShare={onShare ? () => onShare([item]) : undefined}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    )
}
