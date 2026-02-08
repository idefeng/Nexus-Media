import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    X,
    Shuffle,
    Repeat,
    Settings2,
    Clock
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MediaItem } from '../../types'

interface SlideshowPlayerProps {
    items: MediaItem[]
    onClose: () => void
    startIndex?: number
}

type PlaybackMode = 'ordered' | 'shuffle'

export function SlideshowPlayer({ items, onClose, startIndex = 0 }: SlideshowPlayerProps) {
    const { t } = useTranslation()
    const [currentIndex, setCurrentIndex] = useState(startIndex)
    const [isPlaying, setIsPlaying] = useState(true)
    const [mode, setMode] = useState<PlaybackMode>('ordered')
    const [intervalSec, setIntervalSec] = useState(5)
    const [showControls, setShowControls] = useState(true)
    const [direction, setDirection] = useState(0) // 1 for next, -1 for prev
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Preload next images
    useEffect(() => {
        const preloadLimit = 2
        for (let i = 1; i <= preloadLimit; i++) {
            const nextIdx = (currentIndex + i) % items.length
            const img = new Image()
            img.src = getMediaSrc(items[nextIdx])
        }
    }, [currentIndex, items])

    const handleNext = useCallback(() => {
        setDirection(1)
        if (mode === 'shuffle') {
            const nextIndex = Math.floor(Math.random() * items.length)
            setCurrentIndex(nextIndex)
        } else {
            setCurrentIndex((prev) => (prev + 1) % items.length)
        }
    }, [items.length, mode])

    const handlePrev = useCallback(() => {
        setDirection(-1)
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
    }, [items.length])

    // Auto-advance logic
    useEffect(() => {
        if (isPlaying) {
            timerRef.current = setInterval(handleNext, intervalSec * 1000)
        } else if (timerRef.current) {
            clearInterval(timerRef.current)
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [isPlaying, intervalSec, handleNext])

    // Toggle controls visibility
    const resetControlsTimeout = useCallback(() => {
        setShowControls(true)
        document.body.style.cursor = 'default'
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false)
            document.body.style.cursor = 'none'
        }, 3000)
    }, [])

    useEffect(() => {
        window.addEventListener('mousemove', resetControlsTimeout)
        resetControlsTimeout()
        return () => {
            window.removeEventListener('mousemove', resetControlsTimeout)
            document.body.style.cursor = 'default'
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
        }
    }, [resetControlsTimeout])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'Space':
                    e.preventDefault()
                    setIsPlaying(!isPlaying)
                    resetControlsTimeout()
                    break
                case 'ArrowRight':
                    handleNext()
                    resetControlsTimeout()
                    break
                case 'ArrowLeft':
                    handlePrev()
                    resetControlsTimeout()
                    break
                case 'Escape':
                    onClose()
                    break
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isPlaying, handleNext, handlePrev, onClose, resetControlsTimeout])

    const getMediaSrc = (mediaItem: MediaItem) => {
        return `nexus-media://local/${mediaItem.path}`
    }

    const currentItem = items[currentIndex]

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        })
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden select-none">
            {/* Background blur effect */}
            <div
                className="absolute inset-0 opacity-30 blur-3xl scale-110 pointer-events-none"
                style={{
                    backgroundImage: `url(${currentItem.thumbnailPath || getMediaSrc(currentItem)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            />

            {/* Media Container */}
            <AnimatePresence initial={false} custom={direction}>
                <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.4 }
                    }}
                    className="absolute inset-0 flex items-center justify-center p-4 md:p-8"
                >
                    {currentItem.type === 'video' ? (
                        <video
                            src={getMediaSrc(currentItem)}
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                            autoPlay
                            muted={true}
                            onEnded={handleNext}
                        />
                    ) : (
                        <img
                            src={getMediaSrc(currentItem)}
                            alt={currentItem.fileName}
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Exit Button */}
            <AnimatePresence>
                {showControls && (
                    <motion.button
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all z-[110]"
                        title={t('slideshow.exit')}
                    >
                        <X className="w-6 h-6" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Bottom Controls */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-8 left-0 right-0 mx-auto w-[90%] max-w-2xl px-6 py-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-white flex flex-col gap-4 z-[110]"
                    >
                        {/* Info & Progress */}
                        <div className="flex items-center justify-between">
                            <div className="truncate pr-4">
                                <h3 className="text-sm font-medium truncate">{currentItem.fileName}</h3>
                                <p className="text-[10px] text-white/50">{t('slideshow.seconds', { count: intervalSec })} / {t('common.app_name')}</p>
                            </div>
                            <div className="text-sm font-mono text-white/80">
                                {currentIndex + 1} <span className="text-white/30">/</span> {items.length}
                            </div>
                        </div>

                        {/* Controls Row */}
                        <div className="flex items-center justify-between gap-4">
                            {/* Mode Switches */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setMode(mode === 'ordered' ? 'shuffle' : 'ordered')}
                                    className={`p-2 rounded-lg transition-all ${mode === 'shuffle' ? 'text-neon-purple bg-white/10' : 'text-white/60 hover:text-white'}`}
                                    title={mode === 'shuffle' ? t('slideshow.shuffle') : t('slideshow.ordered')}
                                >
                                    {mode === 'shuffle' ? <Shuffle className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                                </button>

                                <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                                    <Clock className="w-3 h-3 text-white/40" />
                                    {[3, 5, 10].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setIntervalSec(s)}
                                            className={`text-[10px] w-6 h-6 rounded flex items-center justify-center transition-all ${intervalSec === s ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
                                        >
                                            {s}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Main Playback */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handlePrev}
                                    className="p-2 text-white/80 hover:text-white hover:scale-110 transition-all"
                                >
                                    <SkipBack className="w-6 h-6 fill-current" />
                                </button>
                                <button
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-glow"
                                >
                                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="p-2 text-white/80 hover:text-white hover:scale-110 transition-all"
                                >
                                    <SkipForward className="w-6 h-6 fill-current" />
                                </button>
                            </div>

                            {/* Options Spacer */}
                            <div className="w-[80px] flex justify-end">
                                <button className="p-2 text-white/60 hover:text-white">
                                    <Settings2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
