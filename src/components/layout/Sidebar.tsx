/**
 * 侧边栏组件
 * 包含导航菜单、标签云和高级筛选面板
 */
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
    LayoutGrid,
    LayoutDashboard,
    Clock,
    Heart,
    Tags,
    Image,
    Video,
    Settings,
    Trash2
} from 'lucide-react'
import { FilterPanel, type FilterState, defaultFilterState } from './FilterPanel'
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
    // 高级筛选
    filters?: FilterState
    onFiltersChange?: (filters: FilterState) => void
    availableTags?: string[]
}

// 导航菜单配置
const navItems = [
    { id: 'dashboard' as ViewType, label: 'sidebar.dashboard', icon: LayoutDashboard },
    { id: 'all' as ViewType, label: 'sidebar.all_media', icon: LayoutGrid },
    { id: 'recent' as ViewType, label: 'sidebar.recently_added', icon: Clock },
    { id: 'favorites' as ViewType, label: 'sidebar.favorites', icon: Heart },
    { id: 'cleanup' as ViewType, label: 'sidebar.cleanup', icon: Trash2 }
]

export function Sidebar({
    currentView,
    onViewChange,
    tagStats,
    selectedTag,
    onTagSelect,
    mediaCount,
    filters = defaultFilterState,
    onFiltersChange,
    availableTags = []
}: SidebarProps) {
    const { t } = useTranslation()

    const handleFiltersChange = (newFilters: FilterState) => {
        onFiltersChange?.(newFilters)
    }

    const handleClearFilters = () => {
        onFiltersChange?.(defaultFilterState)
    }

    return (
        <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-64 glass-panel border-r border-gray-100 flex flex-col h-full"
        >
            {/* 可滚动的内容区域 */}
            <div className="flex-1 overflow-y-auto">
                {/* 导航菜单 */}
                <nav className="p-4 space-y-1">
                    <p className="text-xs font-medium text-nexus-text-muted uppercase tracking-wider mb-3 px-4">
                        {t('sidebar.browse')}
                    </p>
                    {navItems.map((item, index) => {
                        const Icon = item.icon
                        const isActive = currentView === item.id
                        const count = item.id === 'all' ? mediaCount.all
                            : item.id === 'recent' ? mediaCount.recent
                                : item.id === 'favorites' ? mediaCount.favorites
                                    : undefined

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
                                <span className="flex-1 text-left">{t(item.label)}</span>
                                {count !== undefined && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive
                                        ? 'bg-neon-cyan/10 text-neon-cyan'
                                        : 'bg-gray-100 text-nexus-text-muted'
                                        }`}>
                                        {count}
                                    </span>
                                )}
                            </motion.button>
                        )
                    })}
                </nav>

                {/* 媒体类型统计 */}
                <div className="px-4 py-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-nexus-text-muted uppercase tracking-wider mb-3 px-4">
                        {t('sidebar.types')}
                    </p>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 px-4 py-2 text-nexus-text-secondary">
                            <Image className="w-4 h-4 text-neon-green" />
                            <span className="flex-1">{t('sidebar.images')}</span>
                            <span className="text-xs text-nexus-text-muted">{mediaCount.images}</span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 text-nexus-text-secondary">
                            <Video className="w-4 h-4 text-neon-purple" />
                            <span className="flex-1">{t('sidebar.videos')}</span>
                            <span className="text-xs text-nexus-text-muted">{mediaCount.videos}</span>
                        </div>
                    </div>

                    {/* 高级筛选面板 */}
                    {onFiltersChange && (
                        <FilterPanel
                            filters={filters}
                            onFiltersChange={handleFiltersChange}
                            availableTags={availableTags}
                            onClearAll={handleClearFilters}
                        />
                    )}
                </div>

                {/* 标签云 */}
                <div className="px-4 py-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-3 px-4">
                        <Tags className="w-4 h-4 text-neon-purple" />
                        <p className="text-xs font-medium text-nexus-text-muted uppercase tracking-wider">
                            {t('sidebar.ai_tag_cloud')}
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
            </div>

            {/* 固定在底部的设置按钮和装饰 (不随内容滚动) */}
            <div className="flex-shrink-0 border-t border-gray-100">
                {/* 设置按钮 */}
                <div className="p-4">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            onViewChange('settings')
                            onTagSelect(null)
                        }}
                        className={`nav-item w-full ${currentView === 'settings' ? 'active' : ''}`}
                    >
                        <Settings className={`w-5 h-5 ${currentView === 'settings' ? 'text-neon-cyan' : ''}`} />
                        <span className="flex-1 text-left">{t('sidebar.settings')}</span>
                    </motion.button>
                </div>

                {/* 底部装饰 */}
                <div className="px-4 pb-4 border-white/5">
                    <div className="h-1 w-full rounded-full bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-green opacity-30" />
                </div>
            </div>
        </motion.aside>
    )
}
