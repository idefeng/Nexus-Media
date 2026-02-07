import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Settings, Database, FolderOpen, Cpu, Palette, Globe,
    Info, RefreshCw, Trash2, HardDrive, Zap, Monitor
} from 'lucide-react'
import { usePreferences } from '../../contexts/PreferencesContext'


interface AppConfig {
    database: {
        path: string
        autoBackup: boolean
    }
    scanDirectories: Array<{
        path: string
        addedAt: string
        lastScan?: string
    }>
    exif?: {
        enabled: boolean
        autoExtract: boolean
    }
    ai: {
        enabled: boolean
        useCuda: boolean
        autoAnalyze: boolean
    }
    ui: {
        sidebarCollapsed: boolean
        gridSize: 'small' | 'medium' | 'large'
        theme: 'light' | 'dark' | 'auto'
        language: 'zh-CN' | 'en-US'
    }
    version: string
}

export function SettingsPage() {
    const { preferences, updateGridSize, updateTheme, updateLanguage } = usePreferences()
    const [config, setConfig] = useState<AppConfig | null>(null)
    const [dbSize, setDbSize] = useState<number>(0)
    const [appVersion, setAppVersion] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [showMigrationDialog, setShowMigrationDialog] = useState(false)
    const [newDbPath, setNewDbPath] = useState('')
    const [copyData, setCopyData] = useState(true)

    // Load configuration
    useEffect(() => {
        loadConfig()
    }, [])

    const loadConfig = async () => {
        try {
            const result = await window.electronAPI.config.getAll()
            if (result.success && result.data) {
                setConfig(result.data)
            }

            const sizeResult = await window.electronAPI.config.getDatabaseSize()
            if (sizeResult.success && sizeResult.size !== undefined) {
                setDbSize(sizeResult.size)
            }

            const versionResult = await window.electronAPI.config.getVersion()
            if (versionResult.success && versionResult.version) {
                setAppVersion(versionResult.version)
            }
        } catch (error) {
            console.error('Failed to load config:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
    }

    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toLocaleString('zh-CN')
    }

    const handleDatabasePathChange = async () => {
        const result = await window.electronAPI.config.selectDatabasePath()
        if (result.success && result.path) {
            setNewDbPath(result.path)
            setShowMigrationDialog(true)
        }
    }

    const handleMigrateDatabase = async () => {
        if (!newDbPath) return

        try {
            const result = await window.electronAPI.config.migrateDatabase(newDbPath, copyData)
            if (result.success) {
                alert(result.message || '数据库迁移成功！')
                setShowMigrationDialog(false)
                loadConfig()
            } else {
                alert('迁移失败: ' + result.error)
            }
        } catch (error: any) {
            alert('迁移失败: ' + error.message)
        }
    }

    const handleRemoveDirectory = async (path: string) => {
        if (!confirm(`确定要移除扫描目录 "${path}" 吗？`)) return

        const result = await window.electronAPI.config.removeScanDirectory(path)
        if (result.success) {
            loadConfig()
        }
    }

    const handleRescanDirectory = async (path: string) => {
        // Trigger rescan
        const result = await window.electronAPI.scan.folders([path])
        if (result.success) {
            await window.electronAPI.config.updateScanTimestamp(path)
            loadConfig()
        }
    }

    const handleToggleAI = async (enabled: boolean) => {
        const result = await window.electronAPI.config.toggleAI(enabled)
        if (result.success) {
            loadConfig()
        } else {
            alert('AI 切换失败: ' + result.error)
        }
    }

    const handleToggleCuda = async (enabled: boolean) => {
        const result = await window.electronAPI.config.toggleCuda(enabled)
        if (result.success) {
            if (result.message) alert(result.message)
            loadConfig()
        }
    }


    if (loading || !config) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-neon-cyan" />
                    <p className="text-nexus-text-muted">加载配置中...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto bg-nexus-bg">
            <div className="max-w-4xl mx-auto p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Settings className="w-8 h-8 text-neon-cyan" />
                        <h1 className="text-3xl font-bold text-nexus-text">设置</h1>
                    </div>
                    <p className="text-nexus-text-muted">管理应用配置和偏好设置</p>
                </div>

                {/* Database Settings */}
                <Section icon={<Database />} title="数据库设置">
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-nexus-text-muted">当前路径</label>
                            <div className="mt-1 p-3 bg-nexus-bg-secondary rounded-lg font-mono text-sm text-nexus-text break-all">
                                {config.database.path}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-nexus-text-muted">数据库大小</label>
                            <div className="mt-1 text-nexus-text font-medium">
                                {formatBytes(dbSize)}
                            </div>
                        </div>
                        <button
                            onClick={handleDatabasePathChange}
                            className="px-4 py-2 bg-neon-cyan text-white rounded-lg hover:bg-neon-cyan/80 transition-colors flex items-center gap-2"
                        >
                            <HardDrive className="w-4 h-4" />
                            更改数据库位置
                        </button>
                    </div>
                </Section>

                {/* Scan Directories */}
                <Section icon={<FolderOpen />} title="扫描目录">
                    <div className="space-y-3">
                        {config.scanDirectories.length === 0 ? (
                            <p className="text-nexus-text-muted text-sm">暂无扫描目录</p>
                        ) : (
                            config.scanDirectories.map((dir) => (
                                <div
                                    key={dir.path}
                                    className="p-4 bg-nexus-bg-secondary rounded-lg flex items-center justify-between"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-nexus-text font-medium truncate">{dir.path}</p>
                                        <p className="text-xs text-nexus-text-muted mt-1">
                                            添加于: {formatDate(dir.addedAt)}
                                            {dir.lastScan && ` • 上次扫描: ${formatDate(dir.lastScan)}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => handleRescanDirectory(dir.path)}
                                            className="p-2 hover:bg-nexus-bg-tertiary rounded-lg transition-colors"
                                            title="重新扫描"
                                        >
                                            <RefreshCw className="w-4 h-4 text-neon-cyan" />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveDirectory(dir.path)}
                                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="移除"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Section>

                {/* EXIF Configuration */}
                <Section icon={<Info />} title="EXIF 元数据">
                    <div className="space-y-4">
                        <Toggle
                            label="自动提取 EXIF"
                            description="扫描图片时自动提取拍摄参数和 GPS 信息"
                            checked={config.exif?.autoExtract ?? true}
                            onChange={async (enabled) => {
                                await window.electronAPI.exif.toggleAuto(enabled)
                                loadConfig()
                            }}
                        />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-nexus-text font-medium">手动执行</p>
                                <p className="text-sm text-nexus-text-muted mt-1">立即对未处理的图片运行 EXIF 提取</p>
                            </div>
                            <button
                                onClick={async () => {
                                    const result = await window.electronAPI.exif.start()
                                    if (result.success) alert('EXIF 提取任务已在后台启动')
                                }}
                                className="px-4 py-2 bg-nexus-bg-secondary text-nexus-text rounded-lg hover:bg-nexus-bg-tertiary transition-colors flex items-center gap-2"
                            >
                                <Zap className="w-4 h-4 text-neon-cyan" />
                                立即运行
                            </button>
                        </div>
                    </div>
                </Section>

                {/* AI Configuration */}
                <Section icon={<Cpu />} title="AI 配置">
                    <div className="space-y-4">
                        <Toggle
                            label="启用 AI 功能"
                            description="自动分析图片并生成标签"
                            checked={config.ai.enabled}
                            onChange={handleToggleAI}
                        />
                        <Toggle
                            label="使用 CUDA 加速"
                            description="需要 NVIDIA GPU 支持，重启 AI 服务后生效"
                            checked={config.ai.useCuda}
                            onChange={handleToggleCuda}
                            disabled={!config.ai.enabled}
                        />
                        <Toggle
                            label="自动分析新导入"
                            description="扫描时自动分析新添加的图片"
                            checked={config.ai.autoAnalyze}
                            onChange={async (enabled) => {
                                await window.electronAPI.ai.toggleAuto(enabled)
                                loadConfig()
                            }}
                            disabled={!config.ai.enabled}
                        />
                        <div className={`flex items-center justify-between ${!config.ai.enabled ? 'opacity-50' : ''}`}>
                            <div>
                                <p className="text-nexus-text font-medium">手动执行</p>
                                <p className="text-sm text-nexus-text-muted mt-1">立即对未分析的图片运行 AI 分析</p>
                            </div>
                            <button
                                onClick={async () => {
                                    const result = await window.electronAPI.ai.start()
                                    if (result.success) alert('AI 分析任务已在后台启动')
                                }}
                                disabled={!config.ai.enabled}
                                className="px-4 py-2 bg-nexus-bg-secondary text-nexus-text rounded-lg hover:bg-nexus-bg-tertiary transition-colors flex items-center gap-2"
                            >
                                <Zap className="w-4 h-4 text-neon-cyan" />
                                立即运行
                            </button>
                        </div>
                    </div>
                </Section>

                {/* UI Preferences */}
                <Section icon={<Palette />} title="界面偏好">
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-nexus-text-muted mb-2 block">网格大小</label>
                            <div className="flex gap-2">
                                {(['small', 'medium', 'large'] as const).map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => updateGridSize(size)}
                                        className={`px-4 py-2 rounded-lg transition-colors ${preferences.gridSize === size
                                            ? 'bg-neon-cyan text-white'
                                            : 'bg-nexus-bg-secondary text-nexus-text hover:bg-nexus-bg-tertiary'
                                            }`}
                                    >
                                        {size === 'small' ? '小' : size === 'medium' ? '中' : '大'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-nexus-text-muted mb-2 block">主题</label>
                            <div className="flex gap-2">
                                {(['light', 'dark', 'auto'] as const).map((theme) => (
                                    <button
                                        key={theme}
                                        onClick={() => updateTheme(theme)}
                                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${preferences.theme === theme
                                            ? 'bg-neon-cyan text-white'
                                            : 'bg-nexus-bg-secondary text-nexus-text hover:bg-nexus-bg-tertiary'
                                            }`}
                                    >
                                        <Monitor className="w-4 h-4" />
                                        {theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '自动'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-nexus-text-muted mb-2 block">语言</label>
                            <div className="flex gap-2">
                                {(['zh-CN', 'en-US'] as const).map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => updateLanguage(lang)}
                                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${preferences.language === lang
                                            ? 'bg-neon-cyan text-white'
                                            : 'bg-nexus-bg-secondary text-nexus-text hover:bg-nexus-bg-tertiary'
                                            }`}
                                    >
                                        <Globe className="w-4 h-4" />
                                        {lang === 'zh-CN' ? '简体中文' : 'English'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Section>

                {/* About */}
                <Section icon={<Info />} title="关于">
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-nexus-text-muted">版本</label>
                            <div className="mt-1 text-nexus-text font-medium">
                                灵镜媒体管理器(Nexus Media) v{appVersion || config.version}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-nexus-text-muted">开发团队</label>
                            <div className="mt-1 text-nexus-text">Developer: idefeng(changdefeng06@gmail.com)</div>
                        </div>
                        <button
                            onClick={() => alert('检查更新功能即将推出')}
                            className="px-4 py-2 bg-nexus-bg-secondary text-nexus-text rounded-lg hover:bg-nexus-bg-tertiary transition-colors flex items-center gap-2"
                        >
                            <Zap className="w-4 h-4" />
                            检查更新
                        </button>
                    </div>
                </Section>

                {/* Danger Zone */}
                <div className="mb-8 p-6 bg-red-500/5 rounded-xl border border-red-500/20">
                    <div className="flex items-center gap-3 mb-4">
                        <Trash2 className="text-red-500" />
                        <h2 className="text-xl font-bold text-nexus-text">危险区域</h2>
                    </div>
                    <div>
                        <h3 className="text-nexus-text font-bold mb-1">清空数据库</h3>
                        <p className="text-sm text-nexus-text-muted mb-4">
                            这将重置所有媒体记录、标签和分析数据。您的原始文件不会被删除。此操作无法撤销。
                        </p>
                        <button
                            onClick={async () => {
                                if (confirm('确定要清空数据库吗？此操作无法撤销！\n\n注意：您的原始文件是安全的，不会被删除。')) {
                                    try {
                                        // The API call is to clearDatabase
                                        // Assuming window.electronAPI.cleanup.clearDatabase exists as per vite-env.d.ts
                                        const result = await (window.electronAPI as any).cleanup.clearDatabase()
                                        if (result.success) {
                                            alert('数据库已清空')
                                            window.location.reload()
                                        } else {
                                            alert('操作失败: ' + result.error)
                                        }
                                    } catch (error: any) {
                                        alert('操作失败: ' + error.message)
                                    }
                                }
                            }}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 font-bold"
                        >
                            <Trash2 className="w-4 h-4" />
                            立即清空所有数据
                        </button>
                    </div>
                </div>
            </div>

            {/* Migration Dialog */}
            {showMigrationDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-nexus-bg-secondary rounded-2xl shadow-xl max-w-md w-full p-6 border border-nexus-border"
                    >
                        <h3 className="text-xl font-bold text-nexus-text mb-4">迁移数据库</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-nexus-text-muted">新路径</label>
                                <div className="mt-1 p-3 bg-nexus-bg rounded-lg font-mono text-sm text-nexus-text break-all">
                                    {newDbPath}
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={copyData}
                                    onChange={(e) => setCopyData(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-nexus-text">复制现有数据到新位置</span>
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleMigrateDatabase}
                                    className="flex-1 px-4 py-2 bg-neon-cyan text-white rounded-lg hover:bg-neon-cyan/80 transition-colors"
                                >
                                    确认迁移
                                </button>
                                <button
                                    onClick={() => setShowMigrationDialog(false)}
                                    className="flex-1 px-4 py-2 bg-nexus-bg text-nexus-text rounded-lg hover:bg-nexus-bg-tertiary transition-colors"
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}

// Helper Components
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="mb-8 p-6 bg-nexus-bg-secondary rounded-xl border border-nexus-border">
            <div className="flex items-center gap-3 mb-4">
                <div className="text-neon-cyan">{icon}</div>
                <h2 className="text-xl font-bold text-nexus-text">{title}</h2>
            </div>
            {children}
        </div>
    )
}

function Toggle({
    label,
    description,
    checked,
    onChange,
    disabled = false
}: {
    label: string
    description?: string
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
}) {
    return (
        <div className={`flex items-center justify-between ${disabled ? 'opacity-50' : ''}`}>
            <div className="flex-1">
                <p className="text-nexus-text font-medium">{label}</p>
                {description && <p className="text-sm text-nexus-text-muted mt-1">{description}</p>}
            </div>
            <button
                onClick={() => !disabled && onChange(!checked)}
                disabled={disabled}
                className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-neon-cyan' : 'bg-nexus-bg-tertiary'
                    } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : ''
                        }`}
                />
            </button>
        </div>
    )
}
