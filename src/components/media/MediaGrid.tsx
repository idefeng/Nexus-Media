/**
 * 媒体网格组件
 * 响应式网格布局展示媒体资源，集成虚拟滚动优化大数据性能
 */
import { motion, AnimatePresence } from 'framer-motion'
import { Image, Video, Inbox } from 'lucide-react'
import { VirtuosoGrid } from 'react-virtuoso'
import { MediaCard } from './MediaCard'
import type { MediaItem, ViewType } from '../../types'

interface MediaGridProps {
    items: MediaItem[]
    currentView: ViewType
    selectedTag: string | null
    onFavoriteToggle: (id: number) => void
    onItemClick?: (item: MediaItem) => void
}

// 视图标题配置
const viewTitles: Record<ViewType, { title: string; icon: React.ReactNode }> = {
    all: { title: '所有媒体', icon: <Image className="w-5 h-5" /> },
    recent: { title: '最近添加', icon: <Video className="w-5 h-5" /> },
    favorites: { title: '收藏夹', icon: <Inbox className="w-5 h-5" /> }
}

export function MediaGrid({ items, currentView, selectedTag, onFavoriteToggle, onItemClick }: MediaGridProps) {
    const { title } = viewTitles[currentView]

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
            </div>

            {/* 虚拟化网格 */}
            <div className="flex-1 min-h-0">
                <AnimatePresence mode="wait">
                    {items.length > 0 ? (
                        <VirtuosoGrid
                            style={{ height: '100%', width: '100%' }}
                            data={items}
                            totalCount={items.length}
                            overscan={400} // 增加过度扫描以减少滚动白屏
                            listClassName="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-6"
                            itemContent={(index, item) => (
                                <MediaCard
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    onFavoriteToggle={onFavoriteToggle}
                                    onClick={() => onItemClick?.(item)}
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
        </div>
    )
}
