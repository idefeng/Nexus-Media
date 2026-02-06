/**
 * 顶部标题栏组件
 * 包含窗口控制按钮、搜索框（支持语义搜索）、添加文件夹按钮和扫描状态
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search,
    FolderPlus,
    Minus,
    Square,
    X,
    Sparkles,
    Loader2,
    RefreshCw,
    Brain,
    Zap
} from 'lucide-react'

interface SemanticSearchResult {
    id: number
    score: number
    path: string
}

interface TopBarProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    onAddFolder: () => void
    onRefresh?: () => Promise<void>
    isScanning?: boolean
    scanStatus?: string
    // 语义搜索
    onSemanticSearch?: (query: string) => Promise<SemanticSearchResult[]>
    onSemanticResults?: (results: SemanticSearchResult[] | null) => void
    isSemanticSearchEnabled?: boolean
}

export function TopBar({
    searchQuery,
    onSearchChange,
    onAddFolder,
    onRefresh,
    isScanning = false,
    scanStatus = '',
    onSemanticSearch,
    onSemanticResults,
    isSemanticSearchEnabled = true
}: TopBarProps) {
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isSemanticMode, setIsSemanticMode] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [semanticResults, setSemanticResults] = useState<SemanticSearchResult[] | null>(null)

    // 窗口控制（检查是否在 Electron 环境）
    const isElectron = typeof window !== 'undefined' && window.electronAPI

    // 判断是否可能是描述性搜索（非文件名）
    const isDescriptiveQuery = useCallback((query: string): boolean => {
        if (!query.trim() || query.length < 3) return false

        // 如果包含文件扩展名，可能是文件名搜索
        const fileExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|mp4|avi|mkv|mov|wmv)$/i
        if (fileExtensions.test(query)) return false

        // 如果包含路径分隔符，可能是路径搜索
        if (query.includes('/') || query.includes('\\')) return false

        // 中文或较长的英文短语更可能是描述性搜索
        const hasChinese = /[\u4e00-\u9fa5]/.test(query)
        const hasSpaces = query.includes(' ')

        return hasChinese || hasSpaces || query.length >= 5
    }, [])

    // 防抖执行语义搜索
    useEffect(() => {
        if (!isSemanticMode || !onSemanticSearch || !searchQuery.trim()) {
            setSemanticResults(null)
            onSemanticResults?.(null)
            return
        }

        const timer = setTimeout(async () => {
            if (isDescriptiveQuery(searchQuery)) {
                setIsSearching(true)
                try {
                    const results = await onSemanticSearch(searchQuery)
                    setSemanticResults(results)
                    onSemanticResults?.(results)
                } catch (error) {
                    console.error('语义搜索失败:', error)
                    setSemanticResults(null)
                    onSemanticResults?.(null)
                } finally {
                    setIsSearching(false)
                }
            }
        }, 500) // 500ms 防抖

        return () => clearTimeout(timer)
    }, [searchQuery, isSemanticMode, onSemanticSearch, onSemanticResults, isDescriptiveQuery])

    const handleMinimize = () => {
        if (isElectron) {
            window.electronAPI.window.minimize()
        }
    }

    const handleMaximize = () => {
        if (isElectron) {
            window.electronAPI.window.maximize()
        }
    }

    const handleClose = () => {
        if (isElectron) {
            window.electronAPI.window.close()
        }
    }

    const handleRefresh = async () => {
        if (onRefresh && !isRefreshing) {
            setIsRefreshing(true)
            try {
                await onRefresh()
            } finally {
                setIsRefreshing(false)
            }
        }
    }

    const toggleSemanticMode = () => {
        setIsSemanticMode(!isSemanticMode)
        if (isSemanticMode) {
            // 关闭语义搜索时清除结果
            setSemanticResults(null)
            onSemanticResults?.(null)
        }
    }

    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="h-14 glass-panel border-b border-white/5 flex items-center justify-between px-4 drag-region"
        >
            {/* 左侧 - Logo 和标题 */}
            <div className="flex items-center gap-3 no-drag">
                <div className="relative">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple blur-lg opacity-50" />
                </div>
                <h1 className="font-display font-bold text-lg bg-gradient-to-r from-white to-nexus-text-secondary bg-clip-text text-transparent">
                    Nexus Media
                </h1>
            </div>

            {/* 中间 - 搜索框和扫描状态 */}
            <div className="flex-1 max-w-xl mx-8 no-drag">
                {isScanning ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-3 px-4 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30"
                    >
                        <Loader2 className="w-4 h-4 text-neon-cyan animate-spin" />
                        <span className="text-sm text-neon-cyan truncate flex-1">
                            {scanStatus || '正在扫描...'}
                        </span>
                    </motion.div>
                ) : (
                    <div className="relative group">
                        {/* 搜索图标或 AI 图标 */}
                        {isSearching ? (
                            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-purple animate-spin" />
                        ) : isSemanticMode ? (
                            <Brain className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-purple" />
                        ) : (
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-text-muted group-focus-within:text-neon-cyan transition-colors" />
                        )}

                        <input
                            type="text"
                            placeholder={isSemanticMode ? "输入描述进行 AI 语义搜索..." : "搜索媒体资源..."}
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className={`neon-input pl-10 pr-20 ${isSemanticMode ? 'border-neon-purple/30 focus:border-neon-purple' : ''}`}
                        />

                        {/* 语义搜索切换按钮 */}
                        {isSemanticSearchEnabled && onSemanticSearch && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleSemanticMode}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${isSemanticMode
                                    ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                                    : 'bg-white/5 text-nexus-text-muted hover:bg-white/10'
                                    }`}
                                title={isSemanticMode ? '关闭 AI 搜索' : '开启 AI 语义搜索'}
                            >
                                <Zap className="w-3 h-3" />
                                <span>AI</span>
                            </motion.button>
                        )}

                        {/* 搜索框发光效果 */}
                        <div className={`absolute inset-0 rounded-lg ${isSemanticMode ? 'bg-neon-purple/5' : 'bg-neon-cyan/5'} opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none`} />
                    </div>
                )}

                {/* 语义搜索结果提示 */}
                <AnimatePresence>
                    {isSemanticMode && semanticResults && semanticResults.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute mt-1 text-xs text-neon-purple"
                        >
                            找到 {semanticResults.length} 个语义匹配结果
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 右侧 - 刷新、添加按钮和窗口控制 */}
            <div className="flex items-center gap-2 no-drag">
                {/* 刷新按钮 */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    title="刷新媒体列表"
                >
                    <RefreshCw className={`w-4 h-4 text-nexus-text-secondary ${isRefreshing ? 'animate-spin' : ''}`} />
                </motion.button>

                {/* 添加文件夹按钮 */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onAddFolder}
                    disabled={isScanning}
                    className={`neon-btn-primary flex items-center gap-2 ${isScanning ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    {isScanning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <FolderPlus className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                        {isScanning ? '扫描中...' : '添加文件夹'}
                    </span>
                </motion.button>

                {/* 窗口控制按钮 */}
                {isElectron && (
                    <div className="flex items-center ml-4 border-l border-white/10 pl-4">
                        <button
                            onClick={handleMinimize}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                        >
                            <Minus className="w-3.5 h-3.5 text-nexus-text-secondary" />
                        </button>
                        <button
                            onClick={handleMaximize}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                        >
                            <Square className="w-3 h-3 text-nexus-text-secondary" />
                        </button>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500/20 transition-colors group"
                        >
                            <X className="w-3.5 h-3.5 text-nexus-text-secondary group-hover:text-red-400" />
                        </button>
                    </div>
                )}
            </div>
        </motion.header>
    )
}
