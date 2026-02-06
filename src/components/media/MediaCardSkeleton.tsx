/**
 * 媒体卡片骨架屏
 */

export function MediaCardSkeleton() {
    return (
        <div className="media-card overflow-hidden">
            {/* 缩略图区域 */}
            <div className="relative aspect-[4/3] bg-nexus-bg-secondary animate-pulse" />

            {/* 底部信息区域 */}
            <div className="p-3 bg-nexus-bg-secondary/50">
                <div className="h-4 w-3/4 bg-nexus-text-muted/20 rounded mb-2 animate-pulse" />
                <div className="flex justify-between">
                    <div className="h-3 w-1/4 bg-nexus-text-muted/10 rounded animate-pulse" />
                    <div className="h-3 w-1/5 bg-nexus-text-muted/10 rounded animate-pulse" />
                </div>
                <div className="flex gap-1.5 mt-2">
                    <div className="h-5 w-12 bg-nexus-text-muted/10 rounded-full animate-pulse" />
                    <div className="h-5 w-12 bg-nexus-text-muted/10 rounded-full animate-pulse" />
                </div>
            </div>
        </div>
    )
}
