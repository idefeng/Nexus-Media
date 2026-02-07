/**
 * 媒体卡片组件
 * 展示单个媒体资源的缩略图和信息，支持懒加载、右键菜单和多选
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Play, Image as ImageIcon, Video as VideoIcon, AlertCircle, Check } from 'lucide-react'
import type { MediaItem } from '../../types'

interface MediaCardProps {
    item: MediaItem
    index: number
    onFavoriteToggle: (id: number) => void
    onClick?: () => void
    onContextMenu?: (e: React.MouseEvent, item: MediaItem) => void
    // 多选相关
    isSelected?: boolean
    isSelectionMode?: boolean
    onSelect?: (id: number, e: React.MouseEvent) => void
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 格式化时长
function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
}

// 获取文件类型图标和颜色
function getFileTypeStyle(type: 'image' | 'video') {
    if (type === 'video') {
        return {
            icon: VideoIcon,
            iconClass: 'text-neon-purple',
            bgClass: 'bg-gradient-to-br from-neon-purple/20 to-neon-pink/10',
            borderClass: 'border-neon-purple/30'
        }
    }
    // 图片
    return {
        icon: ImageIcon,
        iconClass: 'text-neon-cyan',
        bgClass: 'bg-gradient-to-br from-neon-cyan/20 to-neon-green/10',
        borderClass: 'border-neon-cyan/30'
    }
}

export function MediaCard({
    item,
    index,
    onFavoriteToggle,
    onClick,
    onContextMenu,
    isSelected = false,
    isSelectionMode = false,
    onSelect
}: MediaCardProps) {
    const [isImageLoaded, setIsImageLoaded] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const fileStyle = getFileTypeStyle(item.type)
    const FileTypeIcon = fileStyle.icon

    const handleClick = (e: React.MouseEvent) => {
        // 如果按住 Ctrl 或 Shift，或在选择模式下，触发选择
        if ((e.ctrlKey || e.shiftKey || isSelectionMode) && onSelect) {
            e.preventDefault()
            onSelect(item.id, e)
        } else {
            onClick?.()
        }
    }

    const handleCheckboxClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        onSelect?.(item.id, e)
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        onContextMenu?.(e, item)
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                duration: 0.3,
                delay: Math.min((index % 20) * 0.02, 0.4),
                ease: "easeOut"
            }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`media-card group relative cursor-pointer ${isSelected ? 'ring-2 ring-neon-cyan ring-offset-2 ring-offset-nexus-bg' : ''
                }`}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 选择复选框 */}
            {(isHovered || isSelectionMode || isSelected) && onSelect && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleCheckboxClick}
                    className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center transition-all ${isSelected
                        ? 'bg-neon-cyan text-black'
                        : 'bg-black/60 backdrop-blur-sm border border-white/30 hover:bg-white/20'
                        }`}
                >
                    {isSelected && <Check className="w-4 h-4" />}
                </motion.button>
            )}

            {/* 缩略图区域 */}
            <div className="relative aspect-[4/3] overflow-hidden bg-nexus-bg-secondary">
                {/* 骨架屏占位 */}
                {item.thumbnailPath && !isImageLoaded && !hasError && (
                    <div className="absolute inset-0 bg-nexus-bg-secondary animate-pulse flex items-center justify-center">
                        <FileTypeIcon className="w-8 h-8 text-nexus-text-muted/30" />
                    </div>
                )}

                {/* 缩略图或占位符 */}
                {item.thumbnailPath && !hasError ? (
                    <img
                        src={item.thumbnailPath}
                        alt={item.fileName}
                        loading="lazy"
                        onLoad={() => setIsImageLoaded(true)}
                        onError={() => setHasError(true)}
                        className={`w-full h-full object-cover transition-all duration-500 ${isImageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                            } group-hover:scale-110`}
                    />
                ) : (
                    <div className={`w-full h-full ${fileStyle.bgClass} flex flex-col items-center justify-center border ${fileStyle.borderClass}`}>
                        {hasError ? (
                            <AlertCircle className="w-10 h-10 text-neon-pink mb-2" />
                        ) : (
                            <FileTypeIcon className={`w-10 h-10 ${fileStyle.iconClass} mb-2`} />
                        )}
                        <span className={`text-[10px] font-bold ${hasError ? 'text-neon-pink' : fileStyle.iconClass} uppercase tracking-tighter`}>
                            {hasError ? '加载失败' : `.${item.ext || item.type}`}
                        </span>
                    </div>
                )}

                {/* 渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* 类型标识 */}
                <div className="absolute top-2 right-10">
                    {item.type === 'video' ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10">
                            <Play className="w-3 h-3 text-white fill-white" />
                            {item.duration ? (
                                <span className="text-xs text-white font-medium">
                                    {formatDuration(item.duration)}
                                </span>
                            ) : (
                                <span className="text-xs text-white font-medium">视频</span>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10">
                            <ImageIcon className="w-3 h-3 text-white" />
                            <span className="text-xs text-white font-medium">图片</span>
                        </div>
                    )}
                </div>

                {/* 收藏按钮 */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                        e.stopPropagation()
                        onFavoriteToggle(item.id)
                    }}
                    className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm ${item.isFavorite
                        ? 'bg-white text-neon-pink shadow-md'
                        : 'bg-white/90 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-neon-pink'
                        }`}
                >
                    <Heart
                        className={`w-4 h-4 transition-colors ${item.isFavorite ? 'fill-neon-pink' : ''
                            }`}
                    />
                </motion.button>

                {/* 相似度评分 (语义搜索时显示) */}
                {item.similarityScore !== undefined && item.similarityScore > 0 && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-neon-green/90 backdrop-blur-sm shadow-sm">
                        <span className="text-xs text-white font-medium">
                            {Math.round(item.similarityScore * 100)}% 匹配
                        </span>
                    </div>
                )}

                {/* 悬浮信息 */}
                <div className="absolute bottom-2 left-2 right-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-sm font-medium truncate drop-shadow-md">{item.fileName}</p>
                    <p className="text-white/80 text-xs drop-shadow-md">
                        {formatFileSize(item.fileSize)}
                        {item.width && item.height && ` • ${item.width}×${item.height}`}
                    </p>
                </div>
            </div>

            {/* 底部信息区域 */}
            <div className="p-4 bg-white">
                {/* 文件名 */}
                <p className="text-nexus-text-primary text-sm font-medium truncate mb-1">
                    {item.fileName}
                </p>

                {/* 文件大小和类型 */}
                <div className="flex items-center justify-between text-xs text-nexus-text-muted">
                    <span>{formatFileSize(item.fileSize)}</span>
                    <span className={`uppercase font-medium tracking-wider ${item.type === 'video' ? 'text-neon-purple' : 'text-neon-cyan'}`}>
                        .{item.ext}
                    </span>
                </div>

                {/* 标签 */}
                {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {item.tags.slice(0, 2).map((tag) => (
                            <span
                                key={tag}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-nexus-text-secondary border border-gray-100"
                            >
                                {tag}
                            </span>
                        ))}
                        {item.tags.length > 2 && (
                            <span className="text-[10px] px-1.5 py-0.5 text-nexus-text-muted">
                                +{item.tags.length - 2}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* 选中状态遮罩 */}
            {isSelected && (
                <div className="absolute inset-0 rounded-2xl ring-2 ring-neon-cyan pointer-events-none" />
            )}
        </motion.div>
    )
}
