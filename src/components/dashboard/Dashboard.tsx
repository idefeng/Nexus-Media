import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Image, Video, Clock, Star, Grid, MapPin, Globe, Compass, ChevronRight } from 'lucide-react'
import { MediaItem, ViewType } from '../../types'

interface DashboardProps {
    mediaCount: {
        all: number;
        recent: number;
        favorites: number;
        images: number;
        videos: number;
    }
    geoStats?: {
        countries: number;
        provinces: number;
        locations: number;
    }
    recentItems: MediaItem[]
    onNavigate: (view: ViewType) => void
    onItemClick: (item: MediaItem) => void
}

export function Dashboard({ mediaCount, geoStats, recentItems, onNavigate, onItemClick }: DashboardProps) {
    const { t } = useTranslation()

    // Animation variants
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    }

    return (
        <div className="p-6 h-full overflow-y-auto scrollbar-thin">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold font-display tracking-tight">
                        {t('sidebar.dashboard')}
                    </h2>
                    <span className="text-nexus-text-muted font-mono text-sm">
                        {new Date().toLocaleDateString()}
                    </span>
                </div>

                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[160px]"
                >
                    {/* Welcome Card - 2x1 */}
                    <motion.div
                        variants={item}
                        className="col-span-1 md:col-span-2 row-span-1 bg-nexus-bg-secondary rounded-2xl p-6 border border-gray-100 relative overflow-hidden group hover:border-neon-electric/30 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-electric/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <h3 className="text-xl font-bold mb-2 text-nexus-text-primary">{t('dashboard.welcome_back')}</h3>
                                <p className="text-nexus-text-secondary max-w-md text-sm">
                                    {t('dashboard.your_vault_ready')} {t('dashboard.new_items_this_week', { count: mediaCount.recent })}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => onNavigate('all')}
                                    className="px-4 py-2 bg-neon-electric text-white rounded-lg text-sm font-medium hover:bg-neon-electric/90 transition-colors shadow-lg shadow-neon-electric/20"
                                >
                                    {t('dashboard.browse_library')}
                                </button>
                                <button
                                    onClick={() => onNavigate('recent')}
                                    className="px-4 py-2 bg-gray-100 text-nexus-text-secondary rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors border border-transparent"
                                >
                                    {t('dashboard.view_recent')}
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Quick Stats - 1x1 each */}
                    <StatCard
                        variants={item}
                        title={t('dashboard.total_assets')}
                        value={mediaCount.all}
                        icon={Grid}
                        color="text-neon-cyan"
                        bgColor="bg-neon-cyan/10"
                        delay={0.1}
                    />
                    <StatCard
                        variants={item}
                        title={t('dashboard.favorites_count')}
                        value={mediaCount.favorites}
                        icon={Star}
                        color="text-neon-pink"
                        bgColor="bg-neon-pink/10"
                        delay={0.2}
                    />

                    {/* Recent Gallery - 2x2 (Large Square) */}
                    <motion.div
                        variants={item}
                        className="col-span-1 md:col-span-2 row-span-2 bg-nexus-bg-secondary rounded-2xl p-6 border border-gray-100 overflow-hidden flex flex-col hover:border-gray-200 transition-colors shadow-sm"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-neon-electric" />
                                <h3 className="font-bold text-lg text-nexus-text-primary">{t('dashboard.recent_uploads')}</h3>
                            </div>
                            <button onClick={() => onNavigate('recent')} className="text-xs text-nexus-text-muted hover:text-nexus-text-primary transition-colors flex items-center gap-1">
                                {t('dashboard.view_all')}
                                <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                            {recentItems.slice(0, 4).map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => onItemClick(item)}
                                    className="relative bg-nexus-bg-tertiary rounded-xl overflow-hidden cursor-pointer group border border-gray-100 hover:border-neon-electric/50 transition-all duration-300 shadow-sm"
                                >
                                    {item.thumbnailPath ? (
                                        <img
                                            src={item.thumbnailPath}
                                            alt={item.fileName}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-nexus-bg-tertiary text-nexus-text-muted">
                                            {item.type === 'video' ? (
                                                <Video className="w-8 h-8 opacity-50" />
                                            ) : (
                                                <Image className="w-8 h-8 opacity-50" />
                                            )}
                                        </div>
                                    )}
                                    {/* Overlay Info */}
                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                                        <span className="text-xs font-mono text-white truncate max-w-[80%] drop-shadow-md">{item.fileName}</span>
                                        <span className="text-[10px] bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded text-white/90 uppercase tracking-wider shadow-sm">{item.ext}</span>
                                    </div>
                                </div>
                            ))}
                            {recentItems.length === 0 && (
                                <div className="col-span-2 flex flex-col items-center justify-center text-nexus-text-muted h-full">
                                    <Image className="w-8 h-8 mb-2 opacity-20" />
                                    <span className="text-sm">{t('dashboard.no_recent_items', 'No recent items')}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Type Stats - 1x1 */}
                    <StatCard
                        variants={item}
                        title={t('dashboard.images_count')}
                        value={mediaCount.images}
                        icon={Image}
                        color="text-neon-green"
                        bgColor="bg-neon-green/10"
                        delay={0.3}
                    />
                    <StatCard
                        variants={item}
                        title={t('dashboard.videos_count')}
                        value={mediaCount.videos}
                        icon={Video}
                        color="text-neon-purple"
                        bgColor="bg-neon-purple/10"
                        delay={0.4}
                    />

                    {/* Cleanup Assistant Card - 2x1 */}
                    <motion.div
                        variants={item}
                        onClick={() => onNavigate('cleanup')}
                        className="col-span-1 md:col-span-2 row-span-1 bg-gradient-to-br from-neon-pink/5 to-neon-cyan/5 rounded-2xl p-6 border border-neon-pink/20 flex items-center justify-between group hover:border-neon-pink/40 transition-all shadow-sm cursor-pointer hover:shadow-md"
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-neon-pink/10 flex items-center justify-center">
                                    <Grid className="w-4 h-4 text-neon-pink" />
                                </div>
                                <h3 className="font-bold text-lg text-nexus-text-primary">{t('cleanup.title', '清理助手')}</h3>
                            </div>
                            <p className="text-sm text-nexus-text-secondary max-w-md">
                                {t('cleanup.description', '检测并清理重复文件、相似照片和低质量图片，释放存储空间')}
                            </p>
                        </div>
                        <button className="px-4 py-2 bg-neon-pink/10 text-neon-pink rounded-lg font-medium text-sm group-hover:bg-neon-pink/20 transition-colors">
                            {t('cleanup.rescan', '开始扫描')}
                        </button>
                    </motion.div>
                </motion.div>

                {/* Footprints Section */}
                {geoStats && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        className="mt-12"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-neon-cyan/10 rounded-xl">
                                <Compass className="w-6 h-6 text-neon-cyan" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-nexus-text-primary">我的足迹</h3>
                                <p className="text-sm text-nexus-text-muted">走过的世界，看过的风景</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <motion.div
                                whileHover={{ y: -5 }}
                                className="bg-white/50 backdrop-blur-md border border-white/20 p-6 rounded-3xl flex items-center gap-4 transition-all hover:bg-white/80 hover:shadow-xl group shadow-sm"
                            >
                                <div className="p-4 bg-neon-cyan/10 rounded-2xl group-hover:bg-neon-cyan group-hover:text-white transition-colors">
                                    <Globe className="w-8 h-8" />
                                </div>
                                <div>
                                    <div className="text-3xl font-black font-display text-nexus-text-primary tabular-nums">
                                        {geoStats.countries}
                                    </div>
                                    <div className="text-sm font-medium text-nexus-text-muted mt-1">追逐的国家/地区</div>
                                </div>
                            </motion.div>

                            <motion.div
                                whileHover={{ y: -5 }}
                                className="bg-white/50 backdrop-blur-md border border-white/20 p-6 rounded-3xl flex items-center gap-4 transition-all hover:bg-white/80 hover:shadow-xl group shadow-sm"
                            >
                                <div className="p-4 bg-neon-purple/10 rounded-2xl group-hover:bg-neon-purple group-hover:text-white transition-colors">
                                    <Compass className="w-8 h-8 text-neon-purple group-hover:text-white" />
                                </div>
                                <div>
                                    <div className="text-3xl font-black font-display text-nexus-text-primary tabular-nums">
                                        {geoStats.provinces}
                                    </div>
                                    <div className="text-sm font-medium text-nexus-text-muted mt-1">跨越的省份/州</div>
                                </div>
                            </motion.div>

                            <motion.div
                                whileHover={{ y: -5 }}
                                className="bg-white/50 backdrop-blur-md border border-white/20 p-6 rounded-3xl flex items-center gap-4 transition-all hover:bg-white/80 hover:shadow-xl group shadow-sm"
                            >
                                <div className="p-4 bg-neon-pink/10 rounded-2xl group-hover:bg-neon-pink group-hover:text-white transition-colors">
                                    <MapPin className="w-8 h-8 text-neon-pink group-hover:text-white" />
                                </div>
                                <div>
                                    <div className="text-3xl font-black font-display text-nexus-text-primary tabular-nums">
                                        {geoStats.locations}
                                    </div>
                                    <div className="text-sm font-medium text-nexus-text-muted mt-1">留影的不同地点</div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}

function StatCard({ title, value, icon: Icon, color, bgColor, variants }: any) {
    return (
        <motion.div
            variants={variants}
            className="col-span-1 row-span-1 bg-nexus-bg-secondary rounded-2xl p-6 border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition-colors group cursor-default shadow-sm hover:shadow-md"
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${bgColor || 'bg-gray-50'}`}>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-bold font-mono mt-2 tracking-tight text-nexus-text-primary"
                >
                    {value}
                </motion.div>
                <div className="text-sm text-nexus-text-secondary mt-1 font-medium">{title}</div>
            </div>
        </motion.div>
    )
}
