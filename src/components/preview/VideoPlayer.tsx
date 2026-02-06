/**
 * 视频播放器组件
 * HTML5 视频播放，支持基本控制
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react'

interface VideoPlayerProps {
    src: string
    poster?: string
}

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [showControls, setShowControls] = useState(true)
    const hideControlsTimer = useRef<NodeJS.Timeout>()

    // 播放/暂停
    const togglePlay = useCallback(() => {
        if (!videoRef.current) return

        if (isPlaying) {
            videoRef.current.pause()
        } else {
            videoRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }, [isPlaying])

    // 静音切换
    const toggleMute = useCallback(() => {
        if (!videoRef.current) return
        videoRef.current.muted = !isMuted
        setIsMuted(!isMuted)
    }, [isMuted])

    // 全屏
    const toggleFullscreen = useCallback(() => {
        if (!videoRef.current) return

        if (document.fullscreenElement) {
            document.exitFullscreen()
        } else {
            videoRef.current.requestFullscreen()
        }
    }, [])

    // 进度更新
    const handleTimeUpdate = useCallback(() => {
        if (!videoRef.current) return
        const current = videoRef.current.currentTime
        const total = videoRef.current.duration
        setCurrentTime(current)
        setProgress((current / total) * 100)
    }, [])

    // 加载元数据
    const handleLoadedMetadata = useCallback(() => {
        if (!videoRef.current) return
        setDuration(videoRef.current.duration)
    }, [])

    // 进度条点击
    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current) return
        const rect = e.currentTarget.getBoundingClientRect()
        const percent = (e.clientX - rect.left) / rect.width
        videoRef.current.currentTime = percent * duration
    }, [duration])

    // 格式化时间
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // 自动隐藏控制栏
    const handleMouseMove = useCallback(() => {
        setShowControls(true)

        if (hideControlsTimer.current) {
            clearTimeout(hideControlsTimer.current)
        }

        hideControlsTimer.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false)
            }
        }, 3000)
    }, [isPlaying])

    // 视频结束
    const handleEnded = useCallback(() => {
        setIsPlaying(false)
        setShowControls(true)
    }, [])

    // 清理定时器
    useEffect(() => {
        return () => {
            if (hideControlsTimer.current) {
                clearTimeout(hideControlsTimer.current)
            }
        }
    }, [])

    // 视频源变化时重置
    useEffect(() => {
        setIsPlaying(false)
        setProgress(0)
        setCurrentTime(0)
    }, [src])

    return (
        <div
            className="relative w-full h-full flex items-center justify-center bg-black"
            onMouseMove={handleMouseMove}
        >
            {/* 视频元素 */}
            <motion.video
                ref={videoRef}
                src={src}
                poster={poster}
                className="max-w-full max-h-full object-contain"
                onClick={togglePlay}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            />

            {/* 播放按钮遮罩 */}
            {!isPlaying && (
                <motion.button
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/30"
                >
                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                        <Play className="w-10 h-10 text-white fill-white ml-1" />
                    </div>
                </motion.button>
            )}

            {/* 控制栏 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
            >
                {/* 进度条 */}
                <div
                    className="w-full h-1 bg-white/20 rounded-full mb-3 cursor-pointer group"
                    onClick={handleProgressClick}
                >
                    <div
                        className="h-full bg-neon-cyan rounded-full relative"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>

                {/* 控制按钮 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={togglePlay}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            {isPlaying ? (
                                <Pause className="w-5 h-5 text-white" />
                            ) : (
                                <Play className="w-5 h-5 text-white fill-white" />
                            )}
                        </button>

                        <button
                            onClick={toggleMute}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            {isMuted ? (
                                <VolumeX className="w-5 h-5 text-white" />
                            ) : (
                                <Volume2 className="w-5 h-5 text-white" />
                            )}
                        </button>

                        <span className="text-white text-sm">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <Maximize2 className="w-5 h-5 text-white" />
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
