/**
 * 顶部标题栏组件
 * 包含窗口控制按钮、搜索框（支持语义搜索）、添加文件夹按钮和扫描状态
 */
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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
import logo from '../../assets/logo.png'

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
    const { t } = useTranslation()
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

    // Keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                const searchInput = document.querySelector<HTMLInputElement>('input[type="text"]')
                if (searchInput) {
                    searchInput.focus()
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

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
            className="h-16 glass-panel border-b border-gray-100 flex items-center justify-between px-6 drag-region z-50 relative"
        >
            {/* 左侧 - Logo 和标题 */}
            <div className="flex items-center gap-3 no-drag w-64">
                <div className="relative group cursor-pointer">
                    <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl shadow-lg shadow-neon-electric/20 group-hover:shadow-neon-electric/40 transition-all duration-300 object-cover" />
                </div>
                <div>
                    <h1 className="font-display font-bold text-lg leading-tight bg-gradient-to-r from-nexus-text-primary to-nexus-text-secondary bg-clip-text text-transparent">
                        {t('common.app_name')}
                    </h1>
                    <span className="text-[10px] text-nexus-text-muted font-mono tracking-wider">{t('common.app_subtitle')}</span>
                </div>
            </div>

            {/* 中间 - 搜索框 (Command-K Style) */}
            <div className="flex-1 max-w-2xl mx-auto no-drag relative">
                {isScanning ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 w-full justify-center"
                    >
                        <Loader2 className="w-4 h-4 text-neon-cyan animate-spin" />
                        <span className="text-sm text-neon-cyan font-medium">
                            {scanStatus || t('topbar.scanning')}
                        </span>
                    </motion.div>
                ) : (
                    <div className="relative group w-full">
                        <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 pointer-events-none ${isSearching || isSemanticMode ? 'bg-neon-purple/5 opacity-100' : 'bg-neon-electric/5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                            }`} />

                        <div className="relative flex items-center">
                            {/* Icon */}
                            <div className="absolute left-4 text-nexus-text-muted transition-colors group-focus-within:text-neon-electric">
                                {isSearching ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-neon-purple" />
                                ) : isSemanticMode ? (
                                    <Brain className="w-4 h-4 text-neon-purple" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                            </div>

                            <input
                                type="text"
                                placeholder={isSemanticMode ? t('topbar.semantic_placeholder') : t('topbar.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className={`w-full bg-nexus-bg-tertiary border border-transparent rounded-xl py-2.5 pl-11 pr-32 text-sm text-nexus-text-primary placeholder-nexus-text-muted focus:outline-none focus:border-neon-electric/30 focus:bg-white focus:shadow-clean transition-all duration-300 shadow-sm`}
                            />

                            {/* Right Actions */}
                            <div className="absolute right-2 flex items-center gap-2">
                                {/* Semantic Toggle */}
                                {isSemanticSearchEnabled && onSemanticSearch && (
                                    <button
                                        onClick={toggleSemanticMode}
                                        className={`p-1.5 rounded-lg transition-all ${isSemanticMode
                                            ? 'bg-neon-purple/20 text-neon-purple shadow-sm'
                                            : 'text-nexus-text-muted hover:text-nexus-text-primary hover:bg-gray-200'
                                            }`}
                                        title={isSemanticMode ? 'Disable AI Search' : 'Enable AI Search'}
                                    >
                                        <Zap className="w-3.5 h-3.5" />
                                    </button>
                                )}

                                {/* Shortcut Hint */}
                                <div className="hidden sm:flex items-center gap-1 px-1.5 py-1 rounded-md bg-gray-200 border border-gray-300 text-[10px] font-mono text-gray-500 pointer-events-none select-none">
                                    <span className="text-xs">⌘</span>
                                    <span>K</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 语义搜索结果提示 */}
                <AnimatePresence>
                    {isSemanticMode && semanticResults && semanticResults.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute left-0 right-0 mt-2 p-3 rounded-xl bg-white/95 backdrop-blur-xl border border-gray-200 shadow-xl shadow-gray-200/50 z-50 transform origin-top"
                        >
                            <div className="flex items-center justify-between text-xs text-neon-purple mb-2 px-1">
                                <span className="flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3" />
                                    AI Semantic Match
                                </span>
                                <span className="font-mono opacity-70">{semanticResults.length} results found</span>
                            </div>
                            {/* Simple list preview could go here if implemented */}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 右侧 - 刷新、添加按钮和窗口控制 */}
            <div className="flex items-center gap-2 no-drag">
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
                        {isScanning ? t('topbar.scanning') : t('topbar.add_folder')}
                    </span>
                </motion.button>

                {/* 刷新按钮 */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2.5 rounded-xl bg-white border border-gray-200 text-nexus-text-secondary hover:text-nexus-text-primary hover:border-gray-300 hover:shadow-clean transition-all"
                    title="刷新媒体列表"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </motion.button>

                {/* 窗口控制按钮 */}
                {isElectron && (
                    <div className="flex items-center ml-4 border-l border-gray-200 pl-4">
                        <button
                            onClick={handleMinimize}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
                        >
                            <Minus className="w-3.5 h-3.5 text-nexus-text-secondary" />
                        </button>
                        <button
                            onClick={handleMaximize}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
                        >
                            <Square className="w-3 h-3 text-nexus-text-secondary" />
                        </button>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-100 transition-colors group"
                        >
                            <X className="w-3.5 h-3.5 text-nexus-text-secondary group-hover:text-red-500" />
                        </button>
                    </div>
                )}
            </div>
        </motion.header>
    )
}
