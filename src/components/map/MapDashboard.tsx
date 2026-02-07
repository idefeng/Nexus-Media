import React, { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, Search, MousePointer2 } from 'lucide-react'
import { recordToMediaItem, type MediaItem } from '../../types'

// 修复 Leaflet 默认图标丢失问题
import 'leaflet/dist/leaflet.css'
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png'
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

interface MapDashboardProps {
    onPreviewImage?: (item: MediaItem) => void
    onFilteredMedia?: (items: MediaItem[]) => void
}

/**
 * 地图同步组件 - 监听地图移动并通知范围变化
 */
function MapBoundsListener({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
    const map = useMapEvents({
        moveend() {
            onBoundsChange(map.getBounds())
        },
        zoomend() {
            onBoundsChange(map.getBounds())
        }
    })
    return null
}

export const MapDashboard: React.FC<MapDashboardProps> = ({ onPreviewImage, onFilteredMedia }) => {
    const [items, setItems] = useState<MediaItem[]>([])
    const [loading, setLoading] = useState(true)
    const [selectionMode, setSelectionMode] = useState(false)
    const [selectedAreaItems, setSelectedAreaItems] = useState<MediaItem[]>([])

    // 加载所有带坐标的媒体项
    const loadData = useCallback(async () => {
        if (!window.electronAPI) return
        setLoading(true)
        try {
            const result = await window.electronAPI.map.getMedia()
            if (result.success) {
                const mediaItems = result.items.map(recordToMediaItem)
                setItems(mediaItems)
            }
        } catch (error) {
            console.error('Failed to load map data:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    // 处理范围变化后的空间搜索
    const handleBoundsChange = useCallback(async (bounds: L.LatLngBounds) => {
        if (!selectionMode || !window.electronAPI) return

        const north = bounds.getNorth()
        const south = bounds.getSouth()
        const east = bounds.getEast()
        const west = bounds.getWest()

        try {
            const result = await window.electronAPI.map.searchByBounds({ north, south, east, west })
            if (result.success) {
                const filtered = result.items.map(recordToMediaItem)
                setSelectedAreaItems(filtered)
                if (onFilteredMedia) {
                    onFilteredMedia(filtered)
                }
            }
        } catch (error) {
            console.error('Spatial search failed:', error)
        }
    }, [selectionMode, onFilteredMedia])

    return (
        <div className="relative w-full h-full bg-nexus-bg flex flex-col overflow-hidden">
            {/* 顶部工具栏 */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 p-1 bg-white/80 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl">
                <button
                    onClick={() => setSelectionMode(!selectionMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${selectionMode
                        ? 'bg-neon-cyan text-white shadow-lg'
                        : 'hover:bg-gray-100 text-nexus-text-primary'
                        }`}
                    title="开启后，地图移动将自动筛选当前范围内的照片"
                >
                    <MousePointer2 className="w-4 h-4" />
                    <span className="text-sm font-medium">{selectionMode ? '筛选模式已开启' : '框选筛选'}</span>
                </button>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <div className="px-3 text-sm text-nexus-text-secondary font-medium">
                    {items.length} 个地点
                </div>
            </div>

            {/* 地图主体 */}
            <div className="flex-1 w-full">
                <MapContainer
                    center={[35.0, 105.0]}
                    zoom={4}
                    className="w-full h-full"
                    zoomControl={false}
                >
                    {/* OpenStreetMap 底图 - 全球稳定可用 */}
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapBoundsListener onBoundsChange={handleBoundsChange} />

                    {/* 直接渲染标记 (暂不使用聚合以保持 React 18 兼容性) */}
                    {items.map(item => (
                        item.latitude && item.longitude && (
                            <Marker
                                key={item.id}
                                position={[item.latitude, item.longitude]}
                            >
                                <Popup className="nexus-map-popup">
                                    <div className="flex flex-col gap-2 p-1 min-w-[200px]">
                                        <div
                                            className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                                            onClick={() => onPreviewImage && onPreviewImage(item)}
                                        >
                                            <img
                                                src={item.thumbnailPath || ''}
                                                alt={item.fileName}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                                            <div className="absolute bottom-2 right-2 p-1.5 bg-white/90 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Maximize2 className="w-3 h-3 text-nexus-text-primary" />
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-nexus-text-primary truncate">
                                                {item.fileName}
                                            </span>
                                            <span className="text-[10px] text-nexus-text-muted mt-1">
                                                {new Date(item.birthTime).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    ))}
                </MapContainer>
            </div>

            {/* 筛选结果简报 (浮动面板) */}
            <AnimatePresence>
                {selectionMode && selectedAreaItems.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-2xl px-6"
                    >
                        <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-4 flex items-center gap-4">
                            <div className="p-3 bg-neon-cyan/10 rounded-2xl">
                                <Search className="w-6 h-6 text-neon-cyan" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-nexus-text-primary">区域筛选结果</h3>
                                <p className="text-sm text-nexus-text-muted">当前视野内发现 {selectedAreaItems.length} 个媒体项目</p>
                            </div>
                            <button
                                onClick={() => {
                                    // 可以在这里触发跳转到 Grid 视图并应用筛选
                                    console.log('Navigate to grid with filter', selectedAreaItems)
                                }}
                                className="px-6 py-3 bg-nexus-text-primary text-white rounded-2xl font-bold hover:bg-nexus-text-secondary transition-colors"
                            >
                                查看详情列表
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading && (
                <div className="absolute inset-0 z-[2000] bg-white/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium text-nexus-text-secondary">正在定位足迹...</span>
                    </div>
                </div>
            )}
        </div>
    )
}
