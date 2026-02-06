/**
 * 媒体网格组件
 * 响应式网格布局展示媒体资源
 */
import { motion, AnimatePresence } from 'framer-motion'
import { Image, Video, Inbox } from 'lucide-react'
import { MediaCard } from './MediaCard'
import type { MediaItem, ViewType } from '../../types'

interface MediaGridProps {
    items: MediaItem[]
    currentView: ViewType
    selectedTag: string | null
    onFavoriteToggle: (id: number) => void
}

// 视图标题配置
const viewTitles: Record<ViewType, { title: string; icon: React.ReactNode }> = {
    all: { title: '所有媒体', icon: <Image className="w-5 h-5" /> },
    recent: { title: '最近添加', icon: <Video className="w-5 h-5" /> },
    favorites: { title: '收藏夹', icon: <Inbox className="w-5 h-5" /> }
}

export function MediaGrid({ items, currentView, selectedTag, onFavoriteToggle }: MediaGridProps) {
    const { title } = viewTitles[currentView]

    return (
        <div className="flex-1 overflow-y-auto p-6">
            {/* 页面标题 */}
            <motion.div
                key={currentView + (selectedTag || '')}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-display text-2xl font-bold text-white">
                        {selectedTag ? `#${selectedTag}` : title}
                    </h2>
                    <span className="text-sm text-nexus-text-muted">
                        {items.length} 个项目
                    </span>
                </div>
                {selectedTag && (
                    <p className="text-nexus-text-secondary text-sm">
                        筛选标签: <span className="text-neon-cyan">{selectedTag}</span>
                    </p>
                )}
            </motion.div>

            {/* 媒体网格 */}
            <AnimatePresence mode="wait">
                {items.length > 0 ? (
                    <motion.div
                        key="grid"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
                    >
                        {items.map((item, index) => (
                            <MediaCard
                                key={item.id}
                                item={item}
                                index={index}
                                onFavoriteToggle={onFavoriteToggle}
                            />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center justify-center py-20"
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

            {/* 底部装饰渐变 */}
            <div className="fixed bottom-0 left-64 right-0 h-20 bg-gradient-to-t from-nexus-bg to-transparent pointer-events-none" />
        </div>
    )
}
