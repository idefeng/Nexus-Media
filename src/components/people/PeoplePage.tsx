import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Share2, Edit2, Check, X, Filter, Loader2 } from 'lucide-react'
import { RelationshipGraph } from './RelationshipGraph'
import { MediaGrid } from '../media'
import { MediaItem } from '../../types'

export function PeoplePage() {
    const [view, setView] = useState<'wall' | 'graph'>('wall')
    const [people, setPeople] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [selectedPeople, setSelectedPeople] = useState<number[]>([])
    const [sharedMedia, setSharedMedia] = useState<MediaItem[]>([])
    const [showSharedMedia, setShowSharedMedia] = useState(false)

    useEffect(() => {
        loadPeople()
    }, [])

    const loadPeople = async () => {
        if (!window.electronAPI) return
        setLoading(true)
        try {
            const data = await window.electronAPI.people.getAll()
            setPeople(data)
        } catch (err) {
            console.error('加载人物失败:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateName = async (id: number) => {
        if (!window.electronAPI || !editName.trim()) return
        await window.electronAPI.people.updateName(id, editName)
        setEditingId(null)
        loadPeople()
    }

    const handleLinkClick = async (sourceId: number, targetId: number) => {
        if (!window.electronAPI) return
        const records = await window.electronAPI.people.getSharedMedia(sourceId, targetId)

        const items = records.map((r: any) => ({
            ...r,
            id: r.id,
            path: r.path,
            type: r.type,
            thumbnailPath: r.thumbnail_path ? `nexus-media://local/${r.thumbnail_path.replace(/\\/g, '/')}` : null,
            fileName: r.name,
            fileSize: r.size,
            ext: r.ext,
            isFavorite: Boolean(r.is_favorite),
            tags: JSON.parse(r.tags || '[]'),
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }))

        setSelectedPeople([sourceId, targetId])
        setSharedMedia(items)
        setShowSharedMedia(true)
    }

    return (
        <div className="flex flex-col h-full bg-nexus-bg-primary overflow-hidden">
            <div className="p-8 pb-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple shadow-lg shadow-neon-cyan/20">
                        <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-nexus-text-primary tracking-tight">人物与社交图谱</h1>
                        <p className="text-nexus-text-muted text-sm uppercase tracking-widest font-bold opacity-60">People & Social Circles</p>
                    </div>
                </div>

                <div className="flex bg-black/10 p-1 rounded-xl backdrop-blur-sm border border-white/5">
                    <button
                        onClick={() => setView('wall')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'wall' ? 'bg-white text-nexus-text-primary shadow-sm' : 'text-nexus-text-muted hover:text-nexus-text-secondary'}`}
                    >
                        <Users className="w-4 h-4" />
                        人物墙
                    </button>
                    <button
                        onClick={() => setView('graph')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'graph' ? 'bg-white text-nexus-text-primary shadow-sm' : 'text-nexus-text-muted hover:text-nexus-text-secondary'}`}
                    >
                        <Share2 className="w-4 h-4" />
                        关系图谱
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {view === 'wall' ? (
                        <motion.div
                            key="wall"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="h-full p-8 overflow-y-auto custom-scrollbar"
                        >
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                                {people.map((person) => (
                                    <motion.div
                                        key={person.id}
                                        layoutId={`person-${person.id}`}
                                        className="bg-white/50 backdrop-blur-md rounded-2xl p-4 border border-white/40 shadow-clean hover:shadow-clean-hover transition-all group relative"
                                    >
                                        <div className="aspect-square rounded-full overflow-hidden border-4 border-white mb-4 shadow-inner bg-gray-100 flex items-center justify-center">
                                            {person.cover_thumbnail_path ? (
                                                <img
                                                    src={`nexus-media://local/${person.cover_thumbnail_path.replace(/\\/g, '/')}`}
                                                    alt={person.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Users className="w-1/2 h-1/2 text-gray-300" />
                                            )}
                                        </div>

                                        <div className="text-center">
                                            {editingId === person.id ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        autoFocus
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateName(person.id)}
                                                        className="w-full text-sm font-bold bg-white border border-neon-cyan rounded px-2 py-1 outline-none"
                                                    />
                                                    <button onClick={() => handleUpdateName(person.id)} className="text-neon-green"><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => setEditingId(null)} className="text-red-400"><X className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="font-bold text-nexus-text-primary truncate">{person.name}</span>
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(person.id)
                                                            setEditName(person.name)
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Edit2 className="w-3 h-3 text-nexus-text-muted hover:text-neon-cyan" />
                                                    </button>
                                                </div>
                                            )}
                                            <p className="text-xs text-nexus-text-muted mt-1 font-medium">{person.face_count} 张照片</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="graph"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full"
                        >
                            <RelationshipGraph onLinkClick={handleLinkClick} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 共同出现照片的弹窗/面板 */}
                <AnimatePresence>
                    {showSharedMedia && (
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute inset-y-0 right-0 w-2/3 bg-white shadow-2xl z-50 border-l border-gray-100 flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <Filter className="w-5 h-5 text-neon-cyan" />
                                    <h2 className="text-xl font-bold">
                                        合影分析: {people.find(p => p.id === selectedPeople[0])?.name} & {people.find(p => p.id === selectedPeople[1])?.name}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setShowSharedMedia(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-6 h-6 text-nexus-text-muted" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <MediaGrid
                                    items={sharedMedia}
                                    currentView="all"
                                    selectedTag={null}
                                    onFavoriteToggle={async () => { }}
                                    onItemClick={() => { }}
                                    onDeleteItem={async () => { }}
                                    onBatchDelete={async () => { }}
                                    onBatchAddTags={async () => { }}
                                    onRefresh={() => { }}
                                    allTags={[]}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
