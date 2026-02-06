/**
 * 元数据侧边栏组件
 * 显示和编辑文件的标签、备注和详细信息
 */
import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
    FileText, Calendar, HardDrive, ImageIcon,
    FolderOpen, Edit3, Eye, Save, Sparkles
} from 'lucide-react'
import { TagInput } from './TagInput'
import type { MediaItem } from '../../types'

interface MetadataSidebarProps {
    item: MediaItem
    allTags: string[]
    onTagsChange: (tags: string[]) => void
    onNotesChange: (notes: string) => void
    onAdoptAiTag?: (tag: string) => void
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString)
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    } catch {
        return dateString || '未知'
    }
}

export function MetadataSidebar({ item, allTags, onTagsChange, onNotesChange, onAdoptAiTag }: MetadataSidebarProps) {
    const [notes, setNotes] = useState(item.notes || '')
    const [isEditing, setIsEditing] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // 当 item 变化时更新本地状态
    useEffect(() => {
        setNotes(item.notes || '')
        setIsEditing(false)
        setHasChanges(false)
    }, [item.id, item.notes])

    // 保存备注
    const handleSaveNotes = useCallback(() => {
        onNotesChange(notes)
        setIsEditing(false)
        setHasChanges(false)
    }, [notes, onNotesChange])

    // 备注变化
    const handleNotesChange = useCallback((value: string) => {
        setNotes(value)
        setHasChanges(true)
    }, [])

    // 自动保存（切换文件或关闭时）
    useEffect(() => {
        return () => {
            if (hasChanges) {
                onNotesChange(notes)
            }
        }
    }, [hasChanges, notes, onNotesChange])

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="w-80 h-full bg-nexus-bg-secondary border-l border-nexus-border flex flex-col overflow-hidden"
        >
            {/* 文件名头部 */}
            <div className="p-4 border-b border-nexus-border">
                <h3 className="text-nexus-text-primary font-medium truncate" title={item.fileName}>
                    {item.fileName}
                </h3>
                <p className="text-nexus-text-muted text-sm mt-1">
                    {item.type === 'image' ? '图片' : '视频'} • {item.ext.toUpperCase()}
                </p>
            </div>

            {/* 可滚动内容区 */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {/* 标签区域 */}
                <div className="p-4 border-b border-nexus-border">
                    <h4 className="text-nexus-text-primary text-sm font-medium mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 bg-neon-purple rounded-full" />
                        标签
                    </h4>
                    <TagInput
                        tags={item.tags}
                        allTags={allTags}
                        onChange={onTagsChange}
                    />
                </div>

                {/* AI 建议标签 */}
                {item.aiTags && item.aiTags.length > 0 && (
                    <div className="p-4 border-b border-nexus-border">
                        <h4 className="text-nexus-text-primary text-sm font-medium mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-neon-pink" />
                            AI 建议标签
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {item.aiTags
                                .filter(tag => !item.tags.includes(tag))
                                .map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => onAdoptAiTag?.(tag)}
                                        className="group px-2 py-1 text-xs rounded-full bg-gradient-to-r from-neon-pink/20 to-neon-purple/20 border border-neon-pink/30 text-neon-pink hover:from-neon-pink/30 hover:to-neon-purple/30 transition-all"
                                        title="点击采纳为正式标签"
                                    >
                                        <span className="group-hover:hidden">{tag}</span>
                                        <span className="hidden group-hover:inline">+ {tag}</span>
                                    </button>
                                ))
                            }
                            {item.aiTags.filter(tag => !item.tags.includes(tag)).length === 0 && (
                                <p className="text-nexus-text-muted text-xs italic">
                                    所有 AI 建议已采纳
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* 备注区域 */}
                <div className="p-4 border-b border-nexus-border">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-nexus-text-primary text-sm font-medium flex items-center gap-2">
                            <span className="w-1 h-4 bg-neon-cyan rounded-full" />
                            备注
                        </h4>
                        <div className="flex items-center gap-1">
                            {hasChanges && (
                                <button
                                    onClick={handleSaveNotes}
                                    className="p-1.5 rounded hover:bg-neon-green/20 text-neon-green transition-colors"
                                    title="保存"
                                >
                                    <Save className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`p-1.5 rounded transition-colors ${isEditing
                                    ? 'bg-neon-cyan/20 text-neon-cyan'
                                    : 'hover:bg-nexus-bg-tertiary text-nexus-text-muted'
                                    }`}
                                title={isEditing ? '预览' : '编辑'}
                            >
                                {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {isEditing ? (
                        <textarea
                            value={notes}
                            onChange={(e) => handleNotesChange(e.target.value)}
                            placeholder="使用 Markdown 格式记录备注..."
                            className="w-full h-40 px-3 py-2 rounded-lg bg-nexus-bg-tertiary border border-nexus-border text-nexus-text-primary text-sm placeholder:text-nexus-text-muted focus:outline-none focus:border-neon-cyan/50 resize-none font-mono"
                        />
                    ) : (
                        <div className="min-h-[100px] p-3 rounded-lg bg-nexus-bg-tertiary border border-nexus-border">
                            {notes ? (
                                <div className="prose prose-sm prose-invert max-w-none text-nexus-text-primary">
                                    <ReactMarkdown>{notes}</ReactMarkdown>
                                </div>
                            ) : (
                                <p className="text-nexus-text-muted text-sm italic">
                                    暂无备注，点击编辑按钮添加...
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* 文件详情 */}
                <div className="p-4">
                    <h4 className="text-nexus-text-primary text-sm font-medium mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 bg-neon-green rounded-full" />
                        文件详情
                    </h4>

                    <div className="space-y-3">
                        {/* 文件大小 */}
                        <div className="flex items-start gap-3">
                            <HardDrive className="w-4 h-4 text-nexus-text-muted mt-0.5" />
                            <div>
                                <p className="text-nexus-text-muted text-xs">文件大小</p>
                                <p className="text-nexus-text-primary text-sm">{formatFileSize(item.fileSize)}</p>
                            </div>
                        </div>

                        {/* 分辨率 */}
                        {item.width && item.height && (
                            <div className="flex items-start gap-3">
                                <ImageIcon className="w-4 h-4 text-nexus-text-muted mt-0.5" />
                                <div>
                                    <p className="text-nexus-text-muted text-xs">分辨率</p>
                                    <p className="text-nexus-text-primary text-sm">{item.width} × {item.height}</p>
                                </div>
                            </div>
                        )}

                        {/* 创建时间 */}
                        <div className="flex items-start gap-3">
                            <Calendar className="w-4 h-4 text-nexus-text-muted mt-0.5" />
                            <div>
                                <p className="text-nexus-text-muted text-xs">创建时间</p>
                                <p className="text-nexus-text-primary text-sm">{formatDate(item.birthTime)}</p>
                            </div>
                        </div>

                        {/* 修改时间 */}
                        <div className="flex items-start gap-3">
                            <FileText className="w-4 h-4 text-nexus-text-muted mt-0.5" />
                            <div>
                                <p className="text-nexus-text-muted text-xs">修改时间</p>
                                <p className="text-nexus-text-primary text-sm">{formatDate(item.modifiedTime)}</p>
                            </div>
                        </div>

                        {/* 文件路径 */}
                        <div className="flex items-start gap-3">
                            <FolderOpen className="w-4 h-4 text-nexus-text-muted mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-nexus-text-muted text-xs">文件路径</p>
                                <p className="text-nexus-text-primary text-xs break-all font-mono opacity-80">
                                    {item.path}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
