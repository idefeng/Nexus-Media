/**
 * 图片查看器组件
 * 支持鼠标滚轮缩放和拖拽查看
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface ImageViewerProps {
    src: string
    alt: string
}

export function ImageViewer({ src, alt }: ImageViewerProps) {
    const [scale, setScale] = useState(1)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const containerRef = useRef<HTMLDivElement>(null)

    // 重置视图
    const resetView = useCallback(() => {
        setScale(1)
        setPosition({ x: 0, y: 0 })
    }, [])

    // 缩放控制
    const handleZoom = useCallback((delta: number) => {
        setScale(prev => {
            const newScale = prev + delta
            return Math.max(0.5, Math.min(5, newScale))
        })
    }, [])

    // 鼠标滚轮缩放
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.2 : 0.2
        handleZoom(delta)
    }, [handleZoom])

    // 拖拽开始
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (scale <= 1) return
        setIsDragging(true)
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        })
    }, [scale, position])

    // 拖拽移动
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        })
    }, [isDragging, dragStart])

    // 拖拽结束
    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    // 图片加载时重置
    useEffect(() => {
        resetView()
    }, [src, resetView])

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* 图片容器 */}
            <div
                ref={containerRef}
                className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <motion.img
                    src={src}
                    alt={alt}
                    draggable={false}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: 'center center'
                    }}
                    className="max-w-full max-h-full object-contain select-none transition-transform duration-100"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                />
            </div>

            {/* 缩放控制栏 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm">
                <button
                    onClick={() => handleZoom(-0.25)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    title="缩小"
                >
                    <ZoomOut className="w-5 h-5 text-white" />
                </button>

                <span className="text-white text-sm font-medium min-w-[60px] text-center">
                    {Math.round(scale * 100)}%
                </span>

                <button
                    onClick={() => handleZoom(0.25)}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    title="放大"
                >
                    <ZoomIn className="w-5 h-5 text-white" />
                </button>

                <div className="w-px h-6 bg-white/20 mx-1" />

                <button
                    onClick={resetView}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    title="重置视图"
                >
                    <RotateCcw className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* 缩放提示 */}
            {scale > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                    <span className="text-white/80 text-xs">拖拽查看细节</span>
                </div>
            )}
        </div>
    )
}
