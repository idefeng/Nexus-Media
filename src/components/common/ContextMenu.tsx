/**
 * 右键菜单组件
 * 用于媒体卡片的上下文操作
 */
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'
import {
    FolderOpen,
    Copy,
    Heart,
    Trash2,
    Tag,
    Share2
} from 'lucide-react'

export interface ContextMenuItem {
    id: string
    label: string
    icon: React.ReactNode
    onClick: () => void
    danger?: boolean
    disabled?: boolean
}

interface ContextMenuProps {
    isOpen: boolean
    position: { x: number; y: number }
    items: ContextMenuItem[]
    onClose: () => void
}

export function ContextMenu({ isOpen, position, items, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

    // 点击外部关闭
    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        // 延迟绑定，避免触发菜单的点击事件立即关闭
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside)
            document.addEventListener('keydown', handleEscape)
        }, 0)

        return () => {
            document.removeEventListener('click', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    // 调整位置确保菜单在视口内
    const adjustedPosition = {
        x: Math.min(position.x, window.innerWidth - 200),
        y: Math.min(position.y, window.innerHeight - 250)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="fixed z-50 min-w-[180px] py-1.5 rounded-xl glass-panel border border-gray-200 shadow-xl"
                    style={{
                        left: adjustedPosition.x,
                        top: adjustedPosition.y
                    }}
                >
                    {items.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (!item.disabled) {
                                    item.onClick()
                                    onClose()
                                }
                            }}
                            disabled={item.disabled}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors
                                ${item.disabled
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : item.danger
                                        ? 'text-red-500 hover:bg-red-50'
                                        : 'text-nexus-text-primary hover:bg-gray-50'
                                }
                            `}
                        >
                            <span className="w-4 h-4">{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// 预定义的菜单项生成器
export function createMediaContextMenuItems(
    _path: string,
    isFavorite: boolean,
    handlers: {
        onShowInExplorer: () => void
        onCopyPath: () => void
        onToggleFavorite: () => void
        onDelete: () => void
        onAddTag?: () => void
        onShare?: () => void
    }
): ContextMenuItem[] {
    return [
        {
            id: 'show-in-explorer',
            label: '在资源管理器中显示',
            icon: <FolderOpen className="w-4 h-4" />,
            onClick: handlers.onShowInExplorer
        },
        {
            id: 'copy-path',
            label: '复制路径',
            icon: <Copy className="w-4 h-4" />,
            onClick: handlers.onCopyPath
        },
        {
            id: 'toggle-favorite',
            label: isFavorite ? '取消收藏' : '设为收藏',
            icon: <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />,
            onClick: handlers.onToggleFavorite
        },
        ...(handlers.onShare ? [{
            id: 'share',
            label: '分享...',
            icon: <Share2 className="w-4 h-4" />,
            onClick: handlers.onShare
        }] : []),
        ...(handlers.onAddTag ? [{
            id: 'add-tag',
            label: '添加标签',
            icon: <Tag className="w-4 h-4" />,
            onClick: handlers.onAddTag
        }] : []),
        {
            id: 'delete',
            label: '彻底删除',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: handlers.onDelete,
            danger: true
        }
    ]
}
