/**
 * 侧边栏组件
 * 包含导航菜单和标签云
 */
import { motion } from 'framer-motion'
import {
    LayoutGrid,
    Clock,
    Heart,
    Tags,
    Image,
    Video
} from 'lucide-react'
import type { ViewType, TagStat } from '../../types'

interface SidebarProps {
    currentView: ViewType
    onViewChange: (view: ViewType) => void
    tagStats: TagStat[]
    selectedTag: string | null
    onTagSelect: (tag: string | null) => void
    mediaCount: {
        all: number
        recent: number
        favorites: number
        images: number
        videos: number
    }
}

// 导航菜单配置
const navItems = [
    { id: 'all' as ViewType, label: '所有媒体', icon: LayoutGrid },
    { id: 'recent' as ViewType, label: '最近添加', icon: Clock },
    { id: 'favorites' as ViewType, label: '收藏夹', icon: Heart }
]

export function Sidebar({
    currentView,
    onViewChange,
    tagStats,
    selectedTag,
    onTagSelect,
    mediaCount
}: SidebarProps) {
    return (
        <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-64 glass-panel border-r border-white/5 flex flex-col"
        >
            {/* 导航菜单 */}
            <nav className="p-4 space-y-1">
                <p className="text-xs font-medium text-nexus-text-muted uppercase tracking-wider mb-3 px-4">
                    浏览
                </p>
                {navItems.map((item, index) => {
                    const Icon = item.icon
                    const isActive = currentView === item.id
                    const count = item.id === 'all' ? mediaCount.all
                        : item.id === 'recent' ? mediaCount.recent
                            : mediaCount.favorites

                    return (
                        <motion.button
                            key={item.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.15 + index * 0.05 }}
                            onClick={() => {
                                onViewChange(item.id)
                                onTagSelect(null)
                            }}
                            className={`nav-item w-full ${isActive ? 'active' : ''}`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-neon-cyan' : ''}`} />
                            <span className="flex-1 text-left">{item.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isActive
                                    ? 'bg-neon-cyan/20 text-neon-cyan'
                                    : 'bg-nexus-bg-tertiary text-nexus-text-muted'
                                }`}>
                                {count}
                            </span>
                        </motion.button>
                    )
                })}
            </nav>

            {/* 媒体类型统计 */}
            <div className="px-4 py-3 border-t border-white/5">
                <p className="text-xs font-medium text-nexus-text-muted uppercase tracking-wider mb-3 px-4">
                    类型
                </p>
                <div className="space-y-1">
                    <div className="flex items-center gap-3 px-4 py-2 text-nexus-text-secondary">
                        <Image className="w-4 h-4 text-neon-green" />
                        <span className="flex-1">图片</span>
                        <span className="text-xs text-nexus-text-muted">{mediaCount.images}</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 text-nexus-text-secondary">
                        <Video className="w-4 h-4 text-neon-purple" />
                        <span className="flex-1">视频</span>
                        <span className="text-xs text-nexus-text-muted">{mediaCount.videos}</span>
                    </div>
                </div>
            </div>

            {/* 标签云 */}
            <div className="flex-1 px-4 py-3 border-t border-white/5 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3 px-4">
                    <Tags className="w-4 h-4 text-neon-purple" />
                    <p className="text-xs font-medium text-nexus-text-muted uppercase tracking-wider">
                        标签云
                    </p>
                </div>
                <motion.div
                    className="flex flex-wrap gap-2 px-2"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: {
                            transition: {
                                staggerChildren: 0.03
                            }
                        }
                    }}
                >
                    {tagStats.map((tag) => (
                        <motion.button
                            key={tag.name}
                            variants={{
                                hidden: { scale: 0.8, opacity: 0 },
                                visible: { scale: 1, opacity: 1 }
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onTagSelect(selectedTag === tag.name ? null : tag.name)}
                            className={`tag-cloud-item ${selectedTag === tag.name
                                    ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30'
                                    : ''
                                }`}
                            style={{
                                fontSize: `${Math.min(0.875 + tag.count * 0.05, 1.1)}rem`
                            }}
                        >
                            {tag.name}
                            <span className="ml-1 text-xs opacity-60">{tag.count}</span>
                        </motion.button>
                    ))}
                </motion.div>
            </div>

            {/* 底部装饰 */}
            <div className="p-4 border-t border-white/5">
                <div className="h-1 w-full rounded-full bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-green opacity-30" />
            </div>
        </motion.aside>
    )
}
