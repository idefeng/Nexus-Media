import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
// Removed ZoomIn, ZoomOut, RotateCcw as they move to parent
// Removed unused imports

interface ImageViewerProps {
    src: string
    alt: string
    scale: number
    onZoomChange: (newScale: number) => void
    onResetZoom?: () => void // Optional or remove if truly unused
}

export function ImageViewer({ src, alt, scale, onZoomChange }: ImageViewerProps) {
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

    // Reset position when scale resets to 1 (handled by parent or effect)
    useEffect(() => {
        if (scale === 1) {
            setPosition({ x: 0, y: 0 })
        }
    }, [scale])

    // Mouse wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        // Only prevent default if we are handling the zoom
        // But for modal, we might want to capture all wheel events
        // e.preventDefault() 
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        const newScale = Math.max(0.5, Math.min(5, scale + delta))
        onZoomChange(newScale)
    }, [scale, onZoomChange])

    // Drag Start
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (scale <= 1) return
        e.preventDefault() // Prevent image drag behavior
        setIsDragging(true)
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }, [scale, position])

    // Drag Move
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return
        e.preventDefault()
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        })
    }, [isDragging, dragStart])

    // Drag End
    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    return (
        <div
            className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
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
                    x: position.x,
                    y: position.y,
                    scale: scale,
                    originX: 0.5,
                    originY: 0.5
                }}
                className="max-w-full max-h-full object-contain select-none transition-transform duration-75" // Smoother quick updates
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: scale }}
                transition={{ duration: 0.2 }}
            />
        </div>
    )
}
