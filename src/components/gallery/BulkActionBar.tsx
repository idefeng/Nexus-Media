/**
 * 批量操作工具栏
 * 在有选中项时显示，提供批量添加标签、删除等操作
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, Trash2, Download, X, Check, Loader2 } from 'lucide-react'

interface BulkActionBarProps {
    selectedCount: number
    onAddTags: (tags: string[]) => Promise<void>
    onDelete: () => Promise<void>
    onExport?: () => Promise<void>
    onClearSelection: () => void
    allTags: string[]
}

export function BulkActionBar({
    selectedCount,
    onAddTags,
    onDelete,
    onExport,
    onClearSelection,
    allTags
}: BulkActionBarProps) {
    const [isTagModalOpen, setIsTagModalOpen] = useState(false)
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
    const [newTag, setNewTag] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleAddTags = async () => {
        if (selectedTags.size === 0) return
        setIsLoading(true)
        try {
            await onAddTags(Array.from(selectedTags))
            setIsTagModalOpen(false)
            setSelectedTags(new Set())
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm(`确定要删除选中的 ${selectedCount} 个项目吗？\n文件将移至回收站。`)) return
        setIsDeleting(true)
        try {
            await onDelete()
        } finally {
            setIsDeleting(false)
        }
    }

    const toggleTag = (tag: string) => {
        const newSet = new Set(selectedTags)
        if (newSet.has(tag)) {
            newSet.delete(tag)
        } else {
            newSet.add(tag)
        }
        setSelectedTags(newSet)
    }

    const addNewTag = () => {
        if (newTag.trim() && !selectedTags.has(newTag.trim())) {
            const newSet = new Set(selectedTags)
            newSet.add(newTag.trim())
            setSelectedTags(newSet)
            setNewTag('')
        }
    }

    return (
        <>
            <AnimatePresence>
                {selectedCount > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
                    >
                        <div className="glass-panel border border-white/10 rounded-2xl px-6 py-4 flex items-center gap-6 shadow-2xl">
                            {/* 选中数量 */}
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-neon-cyan" />
                                </div>
                                <span className="text-white font-medium">
                                    已选择 <span className="text-neon-cyan">{selectedCount}</span> 项
                                </span>
                            </div>

                            {/* 分隔线 */}
                            <div className="w-px h-8 bg-white/20" />

                            {/* 操作按钮 */}
                            <div className="flex items-center gap-2">
                                {/* 添加标签 */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsTagModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple transition-colors"
                                >
                                    <Tag className="w-4 h-4" />
                                    <span className="text-sm font-medium">添加标签</span>
                                </motion.button>

                                {/* 导出 */}
                                {onExport && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={onExport}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-green/20 hover:bg-neon-green/30 text-neon-green transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span className="text-sm font-medium">导出</span>
                                    </motion.button>
                                )}

                                {/* 删除 */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    <span className="text-sm font-medium">删除</span>
                                </motion.button>
                            </div>

                            {/* 分隔线 */}
                            <div className="w-px h-8 bg-white/20" />

                            {/* 取消选择 */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClearSelection}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-nexus-text-secondary" />
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 添加标签弹窗 */}
            <AnimatePresence>
                {isTagModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsTagModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-panel border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-white mb-4">
                                为 {selectedCount} 个项目添加标签
                            </h3>

                            {/* 新标签输入 */}
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addNewTag()}
                                    placeholder="输入新标签..."
                                    className="flex-1 neon-input"
                                />
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={addNewTag}
                                    disabled={!newTag.trim()}
                                    className="px-4 py-2 rounded-lg bg-neon-cyan/20 text-neon-cyan disabled:opacity-50"
                                >
                                    添加
                                </motion.button>
                            </div>

                            {/* 已有标签 */}
                            <div className="mb-4">
                                <p className="text-sm text-nexus-text-muted mb-2">已有标签</p>
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                                    {allTags.map((tag) => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={`px-3 py-1 rounded-full text-sm transition-all ${selectedTags.has(tag)
                                                    ? 'bg-neon-purple text-black'
                                                    : 'bg-white/10 text-nexus-text hover:bg-white/20'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 已选标签预览 */}
                            {selectedTags.size > 0 && (
                                <div className="mb-4 p-3 rounded-lg bg-neon-purple/10 border border-neon-purple/20">
                                    <p className="text-sm text-neon-purple mb-2">将添加以下标签：</p>
                                    <div className="flex flex-wrap gap-1">
                                        {Array.from(selectedTags).map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-0.5 rounded-full bg-neon-purple/30 text-neon-purple text-xs"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 操作按钮 */}
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsTagModalOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-white/10 text-nexus-text hover:bg-white/20 transition-colors"
                                >
                                    取消
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleAddTags}
                                    disabled={selectedTags.size === 0 || isLoading}
                                    className="neon-btn-primary disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        `添加 ${selectedTags.size} 个标签`
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
