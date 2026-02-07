import { motion } from 'framer-motion'
import { HardDrive, Image, Video, Clock, Star, Zap, Activity, Grid } from 'lucide-react'
import { MediaItem, ViewType } from '../../types'

interface DashboardProps {
    mediaCount: {
        all: number;
        recent: number;
        favorites: number;
        images: number;
        videos: number;
    }
    recentItems: MediaItem[]
    onNavigate: (view: ViewType) => void
    onItemClick: (item: MediaItem) => void
}

export function Dashboard({ mediaCount, recentItems, onNavigate, onItemClick }: DashboardProps) {
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
                        Dashboard
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
                                <h3 className="text-xl font-bold mb-2 text-nexus-text-primary">Welcome Back</h3>
                                <p className="text-nexus-text-secondary max-w-md text-sm">
                                    Your personal media vault is ready. You have {mediaCount.recent} new items this week.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => onNavigate('all')}
                                    className="px-4 py-2 bg-neon-electric text-white rounded-lg text-sm font-medium hover:bg-neon-electric/90 transition-colors shadow-lg shadow-neon-electric/20"
                                >
                                    Browse Library
                                </button>
                                <button
                                    onClick={() => onNavigate('recent')}
                                    className="px-4 py-2 bg-gray-100 text-nexus-text-secondary rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors border border-transparent"
                                >
                                    View Recent
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Quick Stats - 1x1 each */}
                    <StatCard
                        variants={item}
                        title="Total Assets"
                        value={mediaCount.all}
                        icon={Grid}
                        color="text-neon-cyan"
                        bgColor="bg-neon-cyan/10"
                        delay={0.1}
                    />
                    <StatCard
                        variants={item}
                        title="Favorites"
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
                                <h3 className="font-bold text-lg text-nexus-text-primary">Recent Uploads</h3>
                            </div>
                            <button onClick={() => onNavigate('recent')} className="text-xs text-nexus-text-muted hover:text-nexus-text-primary transition-colors">
                                View All
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
                                    <span className="text-sm">No recent items</span>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Type Stats - 1x1 */}
                    <StatCard
                        variants={item}
                        title="Images"
                        value={mediaCount.images}
                        icon={Image}
                        color="text-neon-green"
                        bgColor="bg-neon-green/10"
                        delay={0.3}
                    />
                    <StatCard
                        variants={item}
                        title="Videos"
                        value={mediaCount.videos}
                        icon={Video}
                        color="text-neon-purple"
                        bgColor="bg-neon-purple/10"
                        delay={0.4}
                    />

                    {/* AI Insight / Action Card - 2x1 */}
                    <motion.div
                        variants={item}
                        className="col-span-1 md:col-span-2 row-span-1 bg-white rounded-2xl p-6 border border-gray-100 flex items-center justify-between group hover:border-neon-purple/30 transition-colors shadow-sm"
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-4 h-4 text-neon-purple" />
                                <h3 className="font-bold text-lg text-nexus-text-primary">AI Insights</h3>
                            </div>
                            <p className="text-sm text-nexus-text-secondary max-w-xs">
                                Optimize your library with smart tagging and duplicate detection.
                            </p>
                        </div>
                        <button className="h-10 w-10 bg-neon-purple/10 rounded-full flex items-center justify-center group-hover:bg-neon-purple/20 transition-colors">
                            <Activity className="w-5 h-5 text-neon-purple" />
                        </button>
                    </motion.div>

                    {/* Storage / System Status - 1x1 */}
                    <motion.div
                        variants={item}
                        className="col-span-1 row-span-1 bg-nexus-bg-secondary rounded-2xl p-6 border border-gray-100 flex flex-col justify-between hover:border-gray-200 transition-colors shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-nexus-text-muted text-xs uppercase tracking-wider">Storage</span>
                            <HardDrive className="w-4 h-4 text-nexus-text-muted" />
                        </div>
                        <div>
                            <div className="flex items-end gap-1 mb-1">
                                <span className="text-2xl font-bold font-mono text-nexus-text-primary">Local</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
                                <div className="bg-neon-cyan h-full rounded-full w-[65%]" />
                            </div>
                            <span className="text-[10px] text-nexus-text-muted mt-1 block text-right">65% Used</span>
                        </div>
                    </motion.div>
                </motion.div>
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
