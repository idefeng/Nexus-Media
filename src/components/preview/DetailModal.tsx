/**
 * 详情预览 Modal
 * 全屏浮层，展示媒体文件预览和元数据编辑
 */
import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Heart, Trash2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { ImageViewer } from './ImageViewer'
import { VideoPlayer } from './VideoPlayer'
import { MetadataSidebar } from './MetadataSidebar'
import { PhotoInfoOverlay } from './PhotoInfoOverlay'
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
    // Zoom state
    const [zoomScale, setZoomScale] = useState(1)

    // 当前索引
    const currentIndex = useMemo(() => {
        if (!item) return -1
        return items.findIndex(i => i.id === item.id)
    }, [item, items])

    // 是否有上一个/下一个
    const hasPrev = currentIndex > 0
    const hasNext = currentIndex < items.length - 1

    // Reset zoom on item change
    useEffect(() => {
        setZoomScale(1)
    }, [item?.id])

    const handleZoomIn = () => setZoomScale(s => Math.min(5, s + 0.25))
    const handleZoomOut = () => setZoomScale(s => Math.max(0.5, s - 0.25))
    const handleResetZoom = () => setZoomScale(1)

    // 导航到上一个
    const goToPrev = useCallback(() => {
        if (hasPrev) onNavigate(items[currentIndex - 1])
    }, [hasPrev, items, currentIndex, onNavigate])

    // 导航到下一个
    const goToNext = useCallback(() => {
        if (hasNext) onNavigate(items[currentIndex + 1])
    }, [hasNext, items, currentIndex, onNavigate])

    // 处理删除项目
    const handleDelete = useCallback(async () => {
        if (!item || !onDeleteItem) return;
        if (!confirm('确定要从图库中删除此文件吗？此操作不可撤销。')) return;
        try {
            const idToDelete = item.id;
            if (hasNext) goToNext();
            else if (hasPrev) goToPrev();
            else onClose();
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
                case 'Escape': onClose(); break
                case 'ArrowLeft': goToPrev(); break
                case 'ArrowRight': goToNext(); break
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose, goToPrev, goToNext])

    // 禁止背景滚动
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    // 获取媒体源 URL
    const getMediaSrc = useCallback((mediaItem: MediaItem) => {
        // Normalize backslashes to forward slashes for consistent URL handling
        const normalizedPath = mediaItem.path.replace(/\\/g, '/')
        return `nexus-media://local/${normalizedPath}`
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
                    {/* Left Preview Area */}
                    <div className="flex-1 relative flex flex-col h-full overflow-hidden">
                        {/* Top Bar */}
                        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pointer-events-none">
                            <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm pointer-events-auto">
                                <span className="text-white text-sm">
                                    {currentIndex + 1} / {items.length}
                                </span>
                            </div>
                        </div>

                        {/* Nav Buttons */}
                        {hasPrev && (
                            <button
                                onClick={goToPrev}
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <ChevronLeft className="w-8 h-8 text-white" />
                            </button>
                        )}
                        {hasNext && (
                            <button
                                onClick={goToNext}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <ChevronRight className="w-8 h-8 text-white" />
                            </button>
                        )}

                        {/* Main Content */}
                        <div
                            className="flex-1 flex items-center justify-center p-8 pb-20 w-full h-full"
                            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full relative"
                                >
                                    {item.type === 'image' ? (
                                        <ImageViewer
                                            src={getMediaSrc(item)}
                                            alt={item.fileName}
                                            scale={zoomScale}
                                            onZoomChange={setZoomScale}
                                            onResetZoom={handleResetZoom}
                                        />
                                    ) : (
                                        <VideoPlayer
                                            src={getMediaSrc(item)}
                                            poster={item.thumbnailPath || undefined}
                                        />
                                    )}

                                    {/* EXIF Info Overlay */}
                                    {item.type === 'image' && item.exifData && (
                                        <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center pointer-events-none">
                                            <PhotoInfoOverlay
                                                exif={item.exifData}
                                                className="pointer-events-auto hover:bg-black/60 transition-colors duration-300"
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Bottom Toolbar - Merged Controls */}
                        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-4 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-24 pointer-events-none">
                            <div className="flex items-center gap-2 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 pointer-events-auto">

                                {/* Zoom Controls */}
                                {item.type === 'image' && (
                                    <>
                                        <button onClick={handleZoomOut} className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors" title="缩小">
                                            <ZoomOut className="w-5 h-5" />
                                        </button>
                                        <span className="text-white/80 text-xs font-mono w-10 text-center">
                                            {Math.round(zoomScale * 100)}%
                                        </span>
                                        <button onClick={handleZoomIn} className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors" title="放大">
                                            <ZoomIn className="w-5 h-5" />
                                        </button>
                                        <button onClick={handleResetZoom} className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors" title="重置视图">
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                        <div className="w-px h-5 bg-white/20 mx-1" />
                                    </>
                                )}

                                {/* Standard Controls */}
                                <button
                                    onClick={() => onFavoriteToggle(item.id)}
                                    className={`p-2 rounded-full transition-colors ${item.isFavorite ? 'bg-neon-pink/20 text-neon-pink' : 'hover:bg-white/10 text-white/80 hover:text-white'}`}
                                    title={item.isFavorite ? '取消收藏' : '添加收藏'}
                                >
                                    <Heart className={`w-5 h-5 ${item.isFavorite ? 'fill-neon-pink' : ''}`} />
                                </button>

                                {onDeleteItem && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                                        className="p-2 rounded-full hover:bg-red-500/20 text-white/80 hover:text-red-400 transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}

                                <div className="w-px h-5 bg-white/20 mx-1" />

                                <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors" title="关闭">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Sidebar */}
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

