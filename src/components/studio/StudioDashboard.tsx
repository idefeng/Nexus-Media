import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Palette, Sparkles, Image as ImageIcon,
    LayoutGrid, Columns, Layers, Download,
    Loader2, Check, RefreshCw, Plus, Minus
} from 'lucide-react'
import { MediaItem } from '../../types'

export function StudioDashboard() {
    // const { t } = useTranslation()
    const [mode, setMode] = useState<'text' | 'image'>('text')
    const [prompt, setPrompt] = useState('')
    const [referenceImages, setReferenceImages] = useState<MediaItem[]>([])
    const [style, setStyle] = useState<'compact' | 'masonry' | 'filmstrip'>('compact')
    const [bgColor, setBgColor] = useState('#000000')
    const [generating, setGenerating] = useState(false)
    const [result, setResult] = useState<{ id: number, path: string } | null>(null)
    const [error, setError] = useState<string | null>(null)

    // 生成拼图
    const handleGenerate = async () => {
        if (mode === 'text' && !prompt.trim()) return
        if (mode === 'image' && referenceImages.length === 0) return

        setGenerating(true)
        setError(null)
        setResult(null)

        try {
            const res = await (window.electronAPI as any).studio.generateCollage({
                type: mode,
                prompt: mode === 'text' ? prompt : undefined,
                referenceIds: mode === 'image' ? referenceImages.map(img => img.id) : undefined,
                style,
                backgroundColor: bgColor,
                limit: 30
            })

            if (res.success) {
                setResult({ id: res.id!, path: res.path! })
            } else {
                setError(res.error || '生成失败')
            }
        } catch (err: any) {
            setError(err.message || '连接 AI 服务失败')
        } finally {
            setGenerating(false)
        }
    }

    const removeFromReferences = (id: number) => {
        setReferenceImages(prev => prev.filter(img => img.id !== id))
    }

    return (
        <div className="flex flex-col h-full bg-nexus-bg-primary overflow-hidden">
            {/* 顶部标题区 */}
            <div className="p-8 pb-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink">
                        <Palette className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-nexus-text-primary tracking-tight">AI 创意工作室</h1>
                        <p className="text-nexus-text-muted text-sm uppercase tracking-widest font-bold opacity-60">Nexus Creative Studio</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-6 px-8 pb-8 overflow-hidden">
                {/* 左侧控制栏 */}
                <div className="w-96 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                    {/* 创作模式切换 */}
                    <div className="p-6 glass-panel border-white/5 space-y-4">
                        <h3 className="text-sm font-bold text-nexus-text-secondary uppercase tracking-widest">创作模式</h3>
                        <div className="flex p-1 bg-black/20 rounded-xl">
                            <button
                                onClick={() => setMode('text')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'text' ? 'bg-nexus-bg-secondary text-neon-cyan shadow-lg' : 'text-nexus-text-muted hover:text-nexus-text-secondary'
                                    }`}
                            >
                                <Sparkles className="w-4 h-4" />
                                主题生成
                            </button>
                            <button
                                onClick={() => setMode('image')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${mode === 'image' ? 'bg-nexus-bg-secondary text-neon-pink shadow-lg' : 'text-nexus-text-muted hover:text-nexus-text-secondary'
                                    }`}
                            >
                                <ImageIcon className="w-4 h-4" />
                                以图生图
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {mode === 'text' ? (
                                <motion.div
                                    key="text-mode"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-3"
                                >
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="输入拼图主题，如：雨中的城市街道、温馨家庭晚餐..."
                                        className="w-full h-24 p-4 bg-black/20 border border-white/5 rounded-xl text-nexus-text-primary text-sm focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 outline-none transition-all resize-none"
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="image-mode"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-4"
                                >
                                    <div className="flex flex-wrap gap-2">
                                        {referenceImages.map(img => (
                                            <div key={img.id} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                                                <img
                                                    src={`nexus-media://local/${(img.thumbnailPath || img.path).replace(/\\/g, '/')}`}
                                                    className="w-full h-full object-cover"
                                                    alt="ref"
                                                />
                                                <button
                                                    onClick={() => removeFromReferences(img.id)}
                                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                >
                                                    <Minus className="w-4 h-4 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                        {referenceImages.length < 5 && (
                                            <button
                                                className="w-16 h-16 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center hover:border-neon-pink/50 hover:bg-neon-pink/5 transition-all text-nexus-text-muted"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-nexus-text-muted uppercase font-bold tracking-widest text-center">拖拽库中照片到此处 (最多5张)</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 样式选择 */}
                    <div className="p-6 glass-panel border-white/5 space-y-4">
                        <h3 className="text-sm font-bold text-nexus-text-secondary uppercase tracking-widest">布局风格</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'compact', icon: LayoutGrid, label: '紧凑网格' },
                                { id: 'masonry', icon: Columns, label: '瀑布流' },
                                { id: 'filmstrip', icon: Layers, label: '电影胶片' }
                            ].map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setStyle(s.id as any)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${style === s.id
                                        ? 'bg-neon-purple/10 border-neon-purple/30 text-neon-purple'
                                        : 'bg-black/20 border-white/5 text-nexus-text-muted hover:text-nexus-text-secondary'
                                        }`}
                                >
                                    <s.icon className="w-5 h-5" />
                                    <span className="text-[10px] font-bold">{s.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <h3 className="text-sm font-bold text-nexus-text-secondary uppercase tracking-widest mb-3">背景色</h3>
                            <div className="flex gap-2">
                                {['#000000', '#ffffff', '#1a1a1a', '#22c55e', '#ef4444', '#3b82f6'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setBgColor(c)}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${bgColor === c ? 'border-white scale-125' : 'border-transparent'
                                            }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={bgColor}
                                    onChange={(e) => setBgColor(e.target.value)}
                                    className="w-6 h-6 rounded-full bg-transparent border-none outline-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 开始生成按钮 */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="w-full py-4 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-neon-pink/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        {generating ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Sparkles className="w-5 h-5" />
                        )}
                        开始生成作品
                    </button>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-medium text-center">
                            {error}
                        </div>
                    )}
                </div>

                {/* 右侧展示区 */}
                <div className="flex-1 glass-panel border-white/5 overflow-hidden relative flex flex-col items-center justify-center">
                    <AnimatePresence mode="wait">
                        {generating ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <div className="relative">
                                    <div className="w-24 h-24 border-4 border-neon-pink/20 border-t-neon-pink rounded-full animate-spin" />
                                    <Palette className="w-10 h-10 text-white absolute inset-0 m-auto animate-pulse" />
                                </div>
                                <div className="text-center space-y-2">
                                    <h4 className="text-xl font-bold text-nexus-text-primary">AI 正在创作中</h4>
                                    <p className="text-nexus-text-muted text-sm">混合特征、计算布局、像素渲染...</p>
                                </div>
                            </motion.div>
                        ) : result ? (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full h-full p-8 flex flex-col gap-6"
                            >
                                <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 shadow-2xl relative group">
                                    <img
                                        src={`nexus-media://local/${result.path.replace(/\\/g, '/')}`}
                                        className="w-full h-full object-contain bg-black/50"
                                        alt="Collage Result"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <button className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
                                            <Download className="w-6 h-6" />
                                        </button>
                                        <button className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
                                            <ImageIcon className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-full text-xs font-bold uppercase tracking-widest">
                                            <Check className="w-3 h-3" />
                                            作品已保存
                                        </div>
                                        <p className="text-nexus-text-muted text-xs font-mono">path: .../Nexus Creations/Nexus_Collage_*.jpg</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setResult(null)}
                                            className="px-6 py-2.5 bg-nexus-bg-secondary text-nexus-text-primary rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-white/5 transition-all"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            重新创作
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="placeholder"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.4 }}
                                className="flex flex-col items-center gap-6 text-nexus-text-muted"
                            >
                                <Palette className="w-32 h-32 stroke-[0.5]" />
                                <div className="text-center">
                                    <p className="text-lg font-bold">准备就绪</p>
                                    <p className="text-xs uppercase tracking-widest mt-1">选择参数并点击生成按钮，开启 AI 视觉创作</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
