
import { Camera, Aperture, Clock } from 'lucide-react'
import type { ExifData } from '../../types'

interface PhotoInfoOverlayProps {
    exif: ExifData
    className?: string
}

function formatExifDate(dateString?: string): string {
    if (!dateString) return ''
    try {
        const date = new Date(dateString)
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    } catch {
        return dateString
    }
}

export function PhotoInfoOverlay({ exif, className = '' }: PhotoInfoOverlayProps) {
    if (!exif) return null

    // Helper to check if we have enough info to show a section
    const hasCamera = exif.make || exif.model || exif.lensModel
    const hasParams = exif.focalLength || exif.aperture || exif.exposureTime || exif.iso
    const hasTime = exif.dateTimeOriginal

    if (!hasCamera && !hasParams && !hasTime) return null

    return (
        <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6 py-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white/90 shadow-lg ${className}`}>
            {/* Camera Model */}
            {hasCamera && (
                <div className="flex items-center gap-2" title={[exif.make, exif.model, exif.lensModel].filter(Boolean).join(' ')}>
                    <Camera className="w-4 h-4 text-white/70" />
                    <span className="text-sm font-medium">
                        {[exif.model || exif.make].filter(Boolean).join(' ')}
                    </span>
                </div>
            )}

            {/* Separator */}
            {hasCamera && hasParams && <div className="w-px h-4 bg-white/20" />}

            {/* Shooting Params */}
            {hasParams && (
                <div className="flex items-center gap-3 text-sm font-mono tracking-tight">
                    <Aperture className="w-4 h-4 text-white/70" />
                    <div className="flex items-center gap-3">
                        {exif.focalLength && <span>{exif.focalLength}mm</span>}
                        {exif.aperture && <span>f/{exif.aperture}</span>}
                        {exif.exposureTime && <span>{exif.exposureTime}s</span>}
                        {exif.iso && <span>ISO{exif.iso}</span>}
                        {exif.exposureBias && exif.exposureBias !== 0 && (
                            <span className="text-white/60 text-xs">
                                {exif.exposureBias > 0 ? '+' : ''}{exif.exposureBias}ev
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Separator */}
            {(hasCamera || hasParams) && hasTime && <div className="w-px h-4 bg-white/20" />}

            {/* Date Time */}
            {hasTime && (
                <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-white/70" />
                    <span>{formatExifDate(exif.dateTimeOriginal)}</span>
                </div>
            )}
        </div>
    )
}
