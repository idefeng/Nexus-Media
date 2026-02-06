/**
 * 高级过滤面板组件
 * 支持日期范围、文件类型、标签组合、文件大小等多维度过滤
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Filter,
    ChevronDown,
    ChevronUp,
    Calendar,
    Image,
    Video,
    Tag,
    HardDrive,
    X
} from 'lucide-react'

export interface FilterState {
    // 日期范围
    dateRange: {
        enabled: boolean
        start: string  // ISO date string
        end: string
    }
    // 文件类型
    fileTypes: {
        images: boolean
        videos: boolean
    }
    // 标签筛选
    tags: {
        enabled: boolean
        selected: string[]
        logic: 'AND' | 'OR'
    }
    // 文件大小
    fileSize: {
        enabled: boolean
        min: number  // bytes
        max: number
    }
}

export const defaultFilterState: FilterState = {
    dateRange: { enabled: false, start: '', end: '' },
    fileTypes: { images: true, videos: true },
    tags: { enabled: false, selected: [], logic: 'OR' },
    fileSize: { enabled: false, min: 0, max: Infinity }
}

interface FilterPanelProps {
    filters: FilterState
    onFiltersChange: (filters: FilterState) => void
    availableTags: string[]
    onClearAll: () => void
}

// 文件大小预设选项
const fileSizePresets = [
    { label: '全部', min: 0, max: Infinity },
    { label: '< 1MB', min: 0, max: 1024 * 1024 },
    { label: '1-10 MB', min: 1024 * 1024, max: 10 * 1024 * 1024 },
    { label: '10-100 MB', min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
    { label: '> 100 MB', min: 100 * 1024 * 1024, max: Infinity }
]

export function FilterPanel({ filters, onFiltersChange, availableTags, onClearAll }: FilterPanelProps) {
    const [isExpanded, setIsExpanded] = useState(true)

    // 计算活跃过滤器数量
    const activeFiltersCount = [
        filters.dateRange.enabled,
        !filters.fileTypes.images || !filters.fileTypes.videos,
        filters.tags.enabled && filters.tags.selected.length > 0,
        filters.fileSize.enabled
    ].filter(Boolean).length

    const updateFilters = (updates: Partial<FilterState>) => {
        onFiltersChange({ ...filters, ...updates })
    }

    return (
        <div className="border-t border-white/10 mt-4 pt-4">
            {/* 标题栏 */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-neon-cyan" />
                    <span className="text-sm font-medium text-nexus-text">高级筛选</span>
                    {activeFiltersCount > 0 && (
                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-neon-cyan/20 text-neon-cyan">
                            {activeFiltersCount}
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-nexus-text-muted" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-nexus-text-muted" />
                )}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 py-3 space-y-4">
                            {/* 日期范围 */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs text-nexus-text-muted">
                                    <Calendar className="w-3.5 h-3.5" />
                                    日期范围
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={filters.dateRange.enabled}
                                        onChange={(e) => updateFilters({
                                            dateRange: { ...filters.dateRange, enabled: e.target.checked }
                                        })}
                                        className="rounded bg-white/10 border-white/20"
                                    />
                                    <input
                                        type="date"
                                        value={filters.dateRange.start}
                                        onChange={(e) => updateFilters({
                                            dateRange: { ...filters.dateRange, start: e.target.value, enabled: true }
                                        })}
                                        disabled={!filters.dateRange.enabled}
                                        className="flex-1 text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-nexus-text disabled:opacity-50"
                                    />
                                    <span className="text-nexus-text-muted text-xs">至</span>
                                    <input
                                        type="date"
                                        value={filters.dateRange.end}
                                        onChange={(e) => updateFilters({
                                            dateRange: { ...filters.dateRange, end: e.target.value, enabled: true }
                                        })}
                                        disabled={!filters.dateRange.enabled}
                                        className="flex-1 text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-nexus-text disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            {/* 文件类型 */}
                            <div className="space-y-2">
                                <label className="text-xs text-nexus-text-muted">文件类型</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => updateFilters({
                                            fileTypes: { ...filters.fileTypes, images: !filters.fileTypes.images }
                                        })}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${filters.fileTypes.images
                                                ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                                                : 'bg-white/5 text-nexus-text-muted border border-white/10'
                                            }`}
                                    >
                                        <Image className="w-3.5 h-3.5" />
                                        图片
                                    </button>
                                    <button
                                        onClick={() => updateFilters({
                                            fileTypes: { ...filters.fileTypes, videos: !filters.fileTypes.videos }
                                        })}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${filters.fileTypes.videos
                                                ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                                                : 'bg-white/5 text-nexus-text-muted border border-white/10'
                                            }`}
                                    >
                                        <Video className="w-3.5 h-3.5" />
                                        视频
                                    </button>
                                </div>
                            </div>

                            {/* 标签组合 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-xs text-nexus-text-muted">
                                        <Tag className="w-3.5 h-3.5" />
                                        标签筛选
                                    </label>
                                    {filters.tags.enabled && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => updateFilters({
                                                    tags: { ...filters.tags, logic: 'AND' }
                                                })}
                                                className={`px-2 py-0.5 text-xs rounded ${filters.tags.logic === 'AND'
                                                        ? 'bg-neon-green/20 text-neon-green'
                                                        : 'bg-white/5 text-nexus-text-muted'
                                                    }`}
                                            >
                                                AND
                                            </button>
                                            <button
                                                onClick={() => updateFilters({
                                                    tags: { ...filters.tags, logic: 'OR' }
                                                })}
                                                className={`px-2 py-0.5 text-xs rounded ${filters.tags.logic === 'OR'
                                                        ? 'bg-neon-green/20 text-neon-green'
                                                        : 'bg-white/5 text-nexus-text-muted'
                                                    }`}
                                            >
                                                OR
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                    {availableTags.slice(0, 20).map((tag) => {
                                        const isSelected = filters.tags.selected.includes(tag)
                                        return (
                                            <button
                                                key={tag}
                                                onClick={() => {
                                                    const newSelected = isSelected
                                                        ? filters.tags.selected.filter(t => t !== tag)
                                                        : [...filters.tags.selected, tag]
                                                    updateFilters({
                                                        tags: {
                                                            ...filters.tags,
                                                            selected: newSelected,
                                                            enabled: newSelected.length > 0
                                                        }
                                                    })
                                                }}
                                                className={`px-2 py-0.5 text-xs rounded-full transition-colors ${isSelected
                                                        ? 'bg-neon-purple text-black'
                                                        : 'bg-white/10 text-nexus-text-secondary hover:bg-white/20'
                                                    }`}
                                            >
                                                {tag}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* 文件大小 */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs text-nexus-text-muted">
                                    <HardDrive className="w-3.5 h-3.5" />
                                    文件大小
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {fileSizePresets.map((preset, i) => {
                                        const isActive = filters.fileSize.enabled
                                            ? filters.fileSize.min === preset.min && filters.fileSize.max === preset.max
                                            : i === 0
                                        return (
                                            <button
                                                key={preset.label}
                                                onClick={() => updateFilters({
                                                    fileSize: {
                                                        enabled: i !== 0,
                                                        min: preset.min,
                                                        max: preset.max
                                                    }
                                                })}
                                                className={`px-2 py-1 text-xs rounded transition-colors ${isActive
                                                        ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                                                        : 'bg-white/5 text-nexus-text-muted border border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                {preset.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* 清除所有过滤器 */}
                            {activeFiltersCount > 0 && (
                                <motion.button
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={onClearAll}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
                                >
                                    <X className="w-4 h-4" />
                                    清除所有筛选
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
