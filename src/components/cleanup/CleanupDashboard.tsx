/**
 * 清理助手仪表盘
 * 显示重复文件、相似图片和低质量照片，支持预览和批量删除
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
    Trash2, Copy, Image, AlertTriangle, RefreshCw,
    ChevronLeft, ChevronRight, Check, X, HardDrive,
    Loader2, Zap
} from 'lucide-react'

// 格式化文件大小
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 清理分析结果类型
interface CleanupAnalysis {
    stats: {
        duplicateGroups: number
        duplicateFiles: number
        duplicateSize: number
        similarGroups: number
        similarFiles: number
        lowQualityCount: number
        totalCount: number
        potentialSavings: number
    }
    exactDuplicates: {
        hash: string
        count: number
        totalSize: number
        items: { id: number; path: string; name: string; size: number; thumbnail_path: string | null }[]
    }[]
    similarImages: {
        groupId: number
        similarity: number
        items: { id: number; path: string; size: number }[]
    }[]
    lowQualityItems: { id: number; path: string; name: string; focus_score?: number }[]
}

// 统计卡片组件
function StatCard({
    icon: Icon,
    label,
    value,
    subValue,
    color = 'cyan'
}: {
    icon: React.ElementType
    label: string
    value: string | number
    subValue?: string
    color?: 'cyan' | 'pink' | 'yellow' | 'green'
}) {
    const colorClasses = {
        cyan: 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/30',
        pink: 'text-neon-pink bg-neon-pink/10 border-neon-pink/30',
        yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
        green: 'text-neon-green bg-neon-green/10 border-neon-green/30'
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border ${colorClasses[color]} backdrop-blur-sm`}
        >
            <div className="flex items-center gap-3">
                <Icon className="w-8 h-8 opacity-80" />
                <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm opacity-70">{label}</p>
                    {subValue && <p className="text-xs opacity-50 mt-1">{subValue}</p>}
                </div>
            </div>
        </motion.div>
    )
}

// 重复文件组组件
function DuplicateGroup({
    group,
    onSelect,
    selectedIds
}: {
    group: CleanupAnalysis['exactDuplicates'][0]
    onSelect: (id: number, selected: boolean) => void
    selectedIds: Set<number>
}) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className="bg-nexus-bg-tertiary rounded-lg border border-nexus-border overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-3 flex items-center justify-between hover:bg-nexus-bg-secondary transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Copy className="w-5 h-5 text-neon-pink" />
                    <div className="text-left">
                        <p className="text-nexus-text-primary font-medium">
                            {group.count} 个重复文件
                        </p>
                        <p className="text-nexus-text-muted text-sm">
                            可节省 {formatFileSize(group.totalSize - (group.items[0]?.size || 0))}
                        </p>
                    </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-nexus-text-muted transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-nexus-border"
                    >
                        <div className="p-3 space-y-2">
                            {group.items.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`flex items-center gap-3 p-2 rounded-lg ${index === 0 ? 'bg-neon-green/10 border border-neon-green/30' : 'bg-nexus-bg-secondary'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(item.id)}
                                        onChange={(e) => onSelect(item.id, e.target.checked)}
                                        disabled={index === 0}
                                        className="w-4 h-4 accent-neon-pink"
                                    />
                                    {item.thumbnail_path ? (
                                        <img
                                            src={`nexus-media://local/${item.thumbnail_path}`}
                                            alt=""
                                            className="w-12 h-12 object-cover rounded"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-nexus-bg-tertiary rounded flex items-center justify-center">
                                            <Image className="w-6 h-6 text-nexus-text-muted" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-nexus-text-primary text-sm truncate">{item.name}</p>
                                        <p className="text-nexus-text-muted text-xs">{formatFileSize(item.size)}</p>
                                    </div>
                                    {index === 0 && (
                                        <span className="px-2 py-1 text-xs bg-neon-green/20 text-neon-green rounded">
                                            保留
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// 相似图片组组件
function SimilarGroup({
    group,
    onSelect,
    selectedIds
}: {
    group: CleanupAnalysis['similarImages'][0]
    onSelect: (id: number, selected: boolean) => void
    selectedIds: Set<number>
}) {
    const [currentIndex, setCurrentIndex] = useState(0)

    const goNext = () => setCurrentIndex((i) => (i + 1) % group.items.length)
    const goPrev = () => setCurrentIndex((i) => (i - 1 + group.items.length) % group.items.length)

    const currentItem = group.items[currentIndex]

    return (
        <div className="bg-nexus-bg-tertiary rounded-lg border border-nexus-border p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Image className="w-5 h-5 text-neon-cyan" />
                    <span className="text-nexus-text-primary font-medium">
                        {group.items.length} 张相似照片
                    </span>
                    <span className="text-nexus-text-muted text-sm">
                        相似度 {(group.similarity * 100).toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* 图片预览区域 */}
            <div className="relative aspect-video bg-nexus-bg-secondary rounded-lg overflow-hidden mb-3">
                <img
                    src={`nexus-media://local/${currentItem.path}`}
                    alt=""
                    className="w-full h-full object-contain"
                />

                {/* 导航按钮 */}
                <button
                    onClick={goPrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                    onClick={goNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-white" />
                </button>

                {/* 指示器 */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {group.items.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentIndex(i)}
                            className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-neon-cyan' : 'bg-white/50'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* 缩略图列表 */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {group.items.map((item, index) => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentIndex(index)}
                        className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${index === currentIndex ? 'border-neon-cyan' : 'border-transparent'
                            }`}
                    >
                        <img
                            src={`nexus-media://local/${item.path}`}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                        <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={(e) => {
                                e.stopPropagation()
                                onSelect(item.id, e.target.checked)
                            }}
                            className="absolute top-1 left-1 w-4 h-4 accent-neon-pink"
                        />
                        {index === 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-neon-green/80 text-white text-xs text-center py-0.5">
                                最佳
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}

export function CleanupDashboard() {
    const { t } = useTranslation()
    const [analysis, setAnalysis] = useState<CleanupAnalysis | null>(null)
    const [loading, setLoading] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [activeTab, setActiveTab] = useState<'duplicates' | 'similar' | 'lowquality'>('duplicates')
    const [cleaning, setCleaning] = useState(false)

    // 执行分析
    const runAnalysis = useCallback(async () => {
        setLoading(true)
        try {
            const result = await window.electronAPI.cleanup.analyze()
            if (result.success && result.data) {
                setAnalysis(result.data as unknown as CleanupAnalysis)
                // 默认选中所有副本（保留第一个）
                const defaultSelected = new Set<number>()
                for (const group of result.data.exactDuplicates) {
                    for (let i = 1; i < group.items.length; i++) {
                        defaultSelected.add(group.items[i].id)
                    }
                }
                setSelectedIds(defaultSelected)
            }
        } catch (error) {
            console.error('清理分析失败:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    // 初次加载
    useEffect(() => {
        runAnalysis()
    }, [runAnalysis])

    // 选择/取消选择
    const handleSelect = useCallback((id: number, selected: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (selected) {
                next.add(id)
            } else {
                next.delete(id)
            }
            return next
        })
    }, [])

    // 执行清理
    const handleClean = useCallback(async () => {
        if (selectedIds.size === 0) return

        setCleaning(true)
        try {
            const result = await window.electronAPI.cleanup.trashItems(Array.from(selectedIds))
            if (result.success) {
                alert(`成功清理 ${result.successCount} 个文件！\n${result.failCount ? `失败 ${result.failCount} 个` : ''}`)
                // 重新分析
                runAnalysis()
            } else {
                alert(`清理失败: ${result.error}`)
            }
        } catch (error) {
            console.error('清理失败:', error)
            alert('清理过程中发生错误')
        } finally {
            setCleaning(false)
        }
    }, [selectedIds, runAnalysis])

    // 全选当前标签页
    const selectAll = useCallback(() => {
        if (!analysis) return

        const newSelected = new Set(selectedIds)

        if (activeTab === 'duplicates') {
            for (const group of analysis.exactDuplicates) {
                for (let i = 1; i < group.items.length; i++) {
                    newSelected.add(group.items[i].id)
                }
            }
        } else if (activeTab === 'similar') {
            for (const group of analysis.similarImages) {
                for (let i = 1; i < group.items.length; i++) {
                    newSelected.add(group.items[i].id)
                }
            }
        } else if (activeTab === 'lowquality') {
            for (const item of analysis.lowQualityItems) {
                newSelected.add(item.id)
            }
        }

        setSelectedIds(newSelected)
    }, [activeTab, analysis, selectedIds])

    if (loading && !analysis) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-neon-cyan animate-spin mx-auto mb-4" />
                    <p className="text-nexus-text-primary">{t('cleanup.analyzing', '正在分析媒体库...')}</p>
                    <p className="text-nexus-text-muted text-sm mt-2">
                        {t('cleanup.analyzing_hint', '这可能需要一些时间，请稍候')}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* 头部 */}
            <div className="p-6 border-b border-nexus-border">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-nexus-text-primary flex items-center gap-3">
                            <Zap className="w-8 h-8 text-neon-cyan" />
                            {t('cleanup.title', '清理助手')}
                        </h1>
                        <p className="text-nexus-text-muted mt-1">
                            {t('cleanup.description', '检测并清理重复文件、相似照片和低质量图片')}
                        </p>
                    </div>
                    <button
                        onClick={runAnalysis}
                        disabled={loading}
                        className="px-4 py-2 bg-neon-cyan/20 text-neon-cyan rounded-lg border border-neon-cyan/30 hover:bg-neon-cyan/30 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('cleanup.rescan', '重新扫描')}
                    </button>
                </div>

                {/* 统计卡片 */}
                {analysis && (
                    <div className="grid grid-cols-4 gap-4">
                        <StatCard
                            icon={Copy}
                            label={t('cleanup.duplicates', '重复文件')}
                            value={analysis.stats.duplicateFiles}
                            subValue={`${analysis.stats.duplicateGroups} 组`}
                            color="pink"
                        />
                        <StatCard
                            icon={Image}
                            label={t('cleanup.similar', '相似照片')}
                            value={analysis.stats.similarFiles}
                            subValue={`${analysis.stats.similarGroups} 组`}
                            color="cyan"
                        />
                        <StatCard
                            icon={AlertTriangle}
                            label={t('cleanup.lowquality', '低质量')}
                            value={analysis.stats.lowQualityCount}
                            subValue="模糊或曝光异常"
                            color="yellow"
                        />
                        <StatCard
                            icon={HardDrive}
                            label={t('cleanup.savings', '可节省空间')}
                            value={formatFileSize(analysis.stats.potentialSavings)}
                            color="green"
                        />
                    </div>
                )}
            </div>

            {/* 标签页 */}
            <div className="flex border-b border-nexus-border">
                {[
                    { id: 'duplicates' as const, label: t('cleanup.tab_duplicates', '精确重复'), count: analysis?.stats.duplicateGroups || 0 },
                    { id: 'similar' as const, label: t('cleanup.tab_similar', '相似照片'), count: analysis?.stats.similarGroups || 0 },
                    { id: 'lowquality' as const, label: t('cleanup.tab_lowquality', '低质量'), count: analysis?.stats.lowQualityCount || 0 }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 font-medium transition-colors relative ${activeTab === tab.id
                            ? 'text-neon-cyan'
                            : 'text-nexus-text-muted hover:text-nexus-text-secondary'
                            }`}
                    >
                        {tab.label}
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-nexus-bg-tertiary">
                            {tab.count}
                        </span>
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="cleanup-tab-indicator"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-cyan"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
                {analysis && (
                    <>
                        {activeTab === 'duplicates' && (
                            <div className="space-y-4">
                                {analysis.exactDuplicates.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Check className="w-16 h-16 text-neon-green mx-auto mb-4" />
                                        <p className="text-nexus-text-primary text-lg">
                                            {t('cleanup.no_duplicates', '没有发现重复文件')}
                                        </p>
                                        <p className="text-nexus-text-muted">
                                            {t('cleanup.no_duplicates_hint', '您的媒体库非常整洁！')}
                                        </p>
                                    </div>
                                ) : (
                                    analysis.exactDuplicates.map(group => (
                                        <DuplicateGroup
                                            key={group.hash}
                                            group={group}
                                            onSelect={handleSelect}
                                            selectedIds={selectedIds}
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'similar' && (
                            <div className="grid grid-cols-2 gap-4">
                                {analysis.similarImages.length === 0 ? (
                                    <div className="col-span-2 text-center py-12">
                                        <Check className="w-16 h-16 text-neon-green mx-auto mb-4" />
                                        <p className="text-nexus-text-primary text-lg">
                                            {t('cleanup.no_similar', '没有发现相似照片')}
                                        </p>
                                    </div>
                                ) : (
                                    analysis.similarImages.map(group => (
                                        <SimilarGroup
                                            key={group.groupId}
                                            group={group}
                                            onSelect={handleSelect}
                                            selectedIds={selectedIds}
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'lowquality' && (
                            <div className="grid grid-cols-4 gap-4">
                                {analysis.lowQualityItems.length === 0 ? (
                                    <div className="col-span-4 text-center py-12">
                                        <Check className="w-16 h-16 text-neon-green mx-auto mb-4" />
                                        <p className="text-nexus-text-primary text-lg">
                                            {t('cleanup.no_lowquality', '没有发现低质量照片')}
                                        </p>
                                    </div>
                                ) : (
                                    analysis.lowQualityItems.map(item => (
                                        <div
                                            key={item.id}
                                            className="bg-nexus-bg-tertiary rounded-lg border border-nexus-border overflow-hidden"
                                        >
                                            <div className="relative aspect-square">
                                                <img
                                                    src={`nexus-media://local/${item.path}`}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={(e) => handleSelect(item.id, e.target.checked)}
                                                    className="absolute top-2 left-2 w-5 h-5 accent-neon-pink"
                                                />
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                                    <span className="text-yellow-400 text-xs flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        模糊
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-2">
                                                <p className="text-nexus-text-primary text-sm truncate">{item.name}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 底部操作栏 */}
            {selectedIds.size > 0 && (
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    className="p-4 border-t border-nexus-border bg-nexus-bg-secondary flex items-center justify-between"
                >
                    <div className="flex items-center gap-4">
                        <p className="text-nexus-text-primary">
                            已选择 <span className="text-neon-pink font-bold">{selectedIds.size}</span> 个文件
                        </p>
                        <button
                            onClick={selectAll}
                            className="text-neon-cyan text-sm hover:underline"
                        >
                            全选当前页
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-nexus-text-muted text-sm hover:text-nexus-text-secondary"
                        >
                            取消全部
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-4 py-2 text-nexus-text-muted hover:text-nexus-text-secondary transition-colors"
                        >
                            <X className="w-4 h-4 inline mr-1" />
                            {t('common.cancel', '取消')}
                        </button>
                        <button
                            onClick={handleClean}
                            disabled={cleaning}
                            className="px-6 py-2 bg-gradient-to-r from-neon-pink to-neon-purple text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                        >
                            {cleaning ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            {t('cleanup.clean_selected', '清理选中项')}
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
