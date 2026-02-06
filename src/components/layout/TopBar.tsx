/**
 * 顶部标题栏组件
 * 包含窗口控制按钮、搜索框、添加文件夹按钮和扫描状态
 */
import { motion } from 'framer-motion'
import {
    Search,
    FolderPlus,
    Minus,
    Square,
    X,
    Sparkles,
    Loader2
} from 'lucide-react'

interface TopBarProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    onAddFolder: () => void
    isScanning?: boolean
    scanStatus?: string
}

export function TopBar({
    searchQuery,
    onSearchChange,
    onAddFolder,
    isScanning = false,
    scanStatus = ''
}: TopBarProps) {
    // 窗口控制（检查是否在 Electron 环境）
    const isElectron = typeof window !== 'undefined' && window.electronAPI

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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nexus-text-muted group-focus-within:text-neon-cyan transition-colors" />
                        <input
                            type="text"
                            placeholder="搜索媒体资源..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="neon-input pl-10 pr-4"
                        />
                        {/* 搜索框发光效果 */}
                        <div className="absolute inset-0 rounded-lg bg-neon-cyan/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                )}
            </div>

            {/* 右侧 - 添加按钮和窗口控制 */}
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
