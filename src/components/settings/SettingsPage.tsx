import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, FolderOpen, CircuitBoard, Database, AlertCircle, Trash2 } from 'lucide-react'

// 自定义确认对话框组件
const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDanger = false
}: {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    isDanger?: boolean
}) => {
    // 强制输入确认
    const [inputValue, setInputValue] = useState('')
    const requiredInput = 'DELETE'

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose()
                }}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100"
                >
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <AlertCircle className="w-8 h-8" />
                            <h3 className="text-xl font-bold">{title}</h3>
                        </div>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            {message}
                        </p>

                        {isDanger && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Type <span className="font-mono font-bold text-red-600">{requiredInput}</span> to confirm:
                                </label>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                                    placeholder={requiredInput}
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={() => {
                                    if (isDanger && inputValue !== requiredInput) return
                                    onConfirm()
                                    onClose()
                                }}
                                disabled={isDanger && inputValue !== requiredInput}
                                className={`px-5 py-2 rounded-lg text-white font-medium transition-all shadow-sm ${isDanger
                                        ? 'bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                        : 'bg-nexus-primary hover:bg-nexus-primary/90'
                                    }`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export function SettingsPage() {
    const { t, i18n } = useTranslation()
    const [isClearDbDialogOpen, setClearDbDialogOpen] = useState(false)
    const [isClearing, setIsClearing] = useState(false)

    // 临时的语言切换函数
    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng)
    }

    // 执行清理
    const handleClearDatabase = async () => {
        setIsClearing(true)
        try {
            const result = await window.electronAPI.cleanup.clearDatabase()
            if (result.success) {
                // 刷新页面或提示成功
                alert('Database cleared successfully. The application will act as a fresh install.')
                // 可以在这里触发全局状态更新
            } else {
                alert(`Failed to clear database: ${result.error}`)
            }
        } catch (error) {
            console.error(error)
            alert('An unexpected error occurred.')
        } finally {
            setIsClearing(false)
        }
    }

    return (
        <div className="flex-1 h-full overflow-y-auto bg-gray-50/50">
            {/* 确认对话框 */}
            {isClearDbDialogOpen && (
                <ConfirmDialog
                    isOpen={isClearDbDialogOpen}
                    onClose={() => setClearDbDialogOpen(false)}
                    onConfirm={handleClearDatabase}
                    title="Clear All Data?"
                    message="This action creates a disaster. It will PERMANENTLY DELETE all imported files records, tags, AI analysis results, and faces. The actual files on your disk will NOT be deleted, but Nexus Media will lose all memory of them. This action CANNOT be undone."
                    confirmText="DELETE EVERYTHING"
                    isDanger={true}
                />
            )}

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto p-8 space-y-8"
            >
                {/* 标题 */}
                <div>
                    <h1 className="text-3xl font-display font-bold text-nexus-text-primary mb-2">
                        {t('settings.title')}
                    </h1>
                    <p className="text-nexus-text-secondary">
                        Manage your preferences and configurations.
                    </p>
                </div>

                {/* 1. General / Language */}
                <section className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                        <Globe className="w-5 h-5 text-neon-cyan" />
                        <h2 className="text-lg font-semibold text-nexus-text-primary">
                            {t('settings.general.title')}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-nexus-text-secondary mb-3">
                                {t('settings.general.language')}
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { code: 'en', label: 'English' },
                                    { code: 'zh', label: '简体中文' },
                                    { code: 'ja', label: '日本語' }
                                ].map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => changeLanguage(lang.code)}
                                        className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 border ${i18n.language.startsWith(lang.code)
                                            ? 'bg-neon-cyan text-white border-transparent shadow-lg shadow-neon-cyan/20'
                                            : 'bg-white text-nexus-text-secondary border-gray-200 hover:border-neon-cyan/50 hover:bg-gray-50'
                                            }`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Library (Coming Soon) */}
                <section className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm opacity-80">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                        <FolderOpen className="w-5 h-5 text-neon-purple" />
                        <h2 className="text-lg font-semibold text-nexus-text-primary">
                            {t('settings.library.title')}
                        </h2>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                            <p className="text-nexus-text-muted text-sm">
                                {t('settings.library.watch_paths')} configuration coming soon.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 3. Database & Storage */}
                <section className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                        <Database className="w-5 h-5 text-red-500" />
                        <h2 className="text-lg font-semibold text-nexus-text-primary">
                            Database Management
                        </h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-xl border border-red-100">
                            <div>
                                <h3 className="font-medium text-red-900 mb-1">Danger Zone: Clear Database</h3>
                                <p className="text-sm text-red-700/80 max-w-lg">
                                    Clear all records, tags, and AI data. This does not delete your actual files, but resets the application state completely.
                                </p>
                            </div>
                            <button
                                onClick={() => setClearDbDialogOpen(true)}
                                disabled={isClearing}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all font-medium shadow-sm disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" />
                                {isClearing ? 'Clearing...' : 'Clear Database'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* 4. AI (Coming Soon) */}
                <section className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm opacity-80">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                        <CircuitBoard className="w-5 h-5 text-neon-green" />
                        <h2 className="text-lg font-semibold text-nexus-text-primary">
                            {t('settings.ai.title')}
                        </h2>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                            <p className="text-nexus-text-muted text-sm">
                                {t('settings.ai.python_path')} configuration coming soon.
                            </p>
                        </div>
                    </div>
                </section>

            </motion.div>
        </div>
    )
}
