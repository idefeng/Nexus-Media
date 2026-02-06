/**
 * 媒体卡片组件
 * 展示单个媒体资源的缩略图和信息
 */
import { motion } from 'framer-motion'
import { Heart, Play, Image as ImageIcon, Video as VideoIcon, MoreHorizontal, FileImage, FileVideo } from 'lucide-react'
import type { MediaItem } from '../../types'

interface MediaCardProps {
    item: MediaItem
    index: number
    onFavoriteToggle: (id: number) => void
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
function getFileTypeStyle(type: 'image' | 'video', ext: string) {
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

export function MediaCard({ item, index, onFavoriteToggle }: MediaCardProps) {
    const fileStyle = getFileTypeStyle(item.type, item.ext)
    const FileTypeIcon = fileStyle.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                duration: 0.4,
                delay: Math.min(index * 0.03, 0.5), // 限制最大延迟
                ease: [0.23, 1, 0.32, 1]
            }}
            whileHover={{ scale: 1.02 }}
            className="media-card group"
        >
            {/* 缩略图区域 */}
            <div className="relative aspect-[4/3] overflow-hidden">
                {/* 缩略图或占位符 */}
                {item.thumbnailPath ? (
                    <img
                        src={item.thumbnailPath}
                        alt={item.fileName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className={`w-full h-full ${fileStyle.bgClass} flex flex-col items-center justify-center border ${fileStyle.borderClass}`}>
                        <FileTypeIcon className={`w-10 h-10 ${fileStyle.iconClass} mb-2`} />
                        <span className={`text-xs font-medium ${fileStyle.iconClass} uppercase tracking-wider`}>
                            .{item.ext || item.type}
                        </span>
                    </div>
                )}

                {/* 渐变遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* 类型标识 */}
                <div className="absolute top-2 left-2">
                    {item.type === 'video' ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-black/60 backdrop-blur-sm">
                            <Play className="w-3 h-3 text-neon-green fill-neon-green" />
                            {item.duration ? (
                                <span className="text-xs text-white font-medium">
                                    {formatDuration(item.duration)}
                                </span>
                            ) : (
                                <span className="text-xs text-white font-medium">视频</span>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-black/60 backdrop-blur-sm">
                            <ImageIcon className="w-3 h-3 text-neon-cyan" />
                            <span className="text-xs text-white font-medium">图片</span>
                        </div>
                    )}
                </div>

                {/* 收藏按钮 */}
                <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                        e.stopPropagation()
                        onFavoriteToggle(item.id)
                    }}
                    className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${item.isFavorite
                        ? 'bg-neon-pink/20 backdrop-blur-sm'
                        : 'bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100'
                        }`}
                >
                    <Heart
                        className={`w-4 h-4 transition-colors ${item.isFavorite
                            ? 'text-neon-pink fill-neon-pink'
                            : 'text-white'
                            }`}
                    />
                </motion.button>

                {/* 更多操作按钮 */}
                <button className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4 text-white" />
                </button>

                {/* 悬浮信息 */}
                <div className="absolute bottom-2 left-2 right-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-sm font-medium truncate">
                        {item.fileName}
                    </p>
                    <p className="text-white/70 text-xs">
                        {formatFileSize(item.fileSize)}
                        {item.width && item.height && ` • ${item.width}×${item.height}`}
                    </p>
                </div>
            </div>

            {/* 底部信息区域 */}
            <div className="p-3">
                {/* 文件名 */}
                <p className="text-nexus-text-primary text-sm font-medium truncate mb-1">
                    {item.fileName}
                </p>

                {/* 文件大小和类型 */}
                <div className="flex items-center justify-between text-xs text-nexus-text-muted">
                    <span>{formatFileSize(item.fileSize)}</span>
                    <span className={`uppercase ${item.type === 'video' ? 'text-neon-purple/70' : 'text-neon-cyan/70'}`}>
                        .{item.ext}
                    </span>
                </div>

                {/* 标签 */}
                {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.tags.slice(0, 2).map((tag) => (
                            <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-neon-purple/10 text-neon-purple/80 border border-neon-purple/20"
                            >
                                {tag}
                            </span>
                        ))}
                        {item.tags.length > 2 && (
                            <span className="text-xs px-2 py-0.5 text-nexus-text-muted">
                                +{item.tags.length - 2}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* 霓虹边框效果 */}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="absolute inset-0 rounded-xl border border-neon-cyan/30" />
                <div className="absolute inset-0 rounded-xl shadow-neon-cyan" />
            </div>
        </motion.div>
    )
}
