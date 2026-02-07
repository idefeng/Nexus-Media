import React from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Globe, FolderOpen, CircuitBoard, Database } from 'lucide-react'

export function SettingsPage() {
    const { t, i18n } = useTranslation()

    // 临时的语言切换函数
    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng)
    }

    return (
        <div className="flex-1 h-full overflow-y-auto bg-gray-50/50">
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

                {/* 3. AI (Coming Soon) */}
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

                {/* 4. Storage (Coming Soon) */}
                <section className="glass-panel p-6 rounded-2xl border border-white/60 shadow-sm opacity-80">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                        <Database className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-nexus-text-primary">
                            {t('settings.storage.title')}
                        </h2>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                            <p className="text-nexus-text-muted text-sm">
                                {t('settings.storage.restart_hint')}
                            </p>
                        </div>
                    </div>
                </section>

            </motion.div>
        </div>
    )
}
