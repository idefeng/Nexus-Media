import { useTranslation } from 'react-i18next'
import { Loader2, Check, Database, Brain } from 'lucide-react'

interface StatusBarProps {
    scanStatus: string
    isScanning: boolean
    dbCount: number
    aiQueueCount?: number
}

export function StatusBar({ scanStatus, isScanning, dbCount, aiQueueCount = 0 }: StatusBarProps) {
    const { t } = useTranslation()

    return (
        <div className="h-7 bg-white/80 backdrop-blur border-t border-gray-100 flex items-center px-4 text-[10px] md:text-xs text-nexus-text-secondary select-none z-40 justify-between">
            {/* Left: Scan Status */}
            <div className="flex items-center gap-2 overflow-hidden max-w-[50%]">
                {isScanning ? (
                    <div className="flex items-center gap-2 text-neon-cyan">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="font-medium truncate">{scanStatus || t('status_bar.scanning')}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-nexus-text-muted">
                        <Check className="w-3 h-3 text-neon-green" />
                        <span>{t('status_bar.ready')}</span>
                    </div>
                )}
            </div>

            {/* Right: Stats */}
            <div className="flex items-center gap-4">
                {/* AI Status (Simulated for now) */}
                {aiQueueCount > 0 && (
                    <div className="flex items-center gap-1.5 text-neon-purple">
                        <Brain className="w-3 h-3 animate-pulse" />
                        <span>{t('status_bar.processing', { count: aiQueueCount })}</span>
                    </div>
                )}

                <div className="flex items-center gap-1.5 text-nexus-text-muted">
                    <Database className="w-3 h-3" />
                    <span>{t('status_bar.total_items', { count: dbCount })}</span>
                </div>
            </div>
        </div>
    )
}
