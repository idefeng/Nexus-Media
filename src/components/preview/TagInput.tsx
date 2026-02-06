/**
 * 标签输入组件
 * 支持添加/删除标签，带自动补全功能
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Tag } from 'lucide-react'

interface TagInputProps {
    tags: string[]
    allTags: string[]  // 所有已存在的标签（用于自动补全）
    onChange: (tags: string[]) => void
}

export function TagInput({ tags, allTags, onChange }: TagInputProps) {
    const [inputValue, setInputValue] = useState('')
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const inputRef = useRef<HTMLInputElement>(null)

    // 过滤建议
    useEffect(() => {
        if (inputValue.trim()) {
            const filtered = allTags.filter(tag =>
                tag.toLowerCase().includes(inputValue.toLowerCase()) &&
                !tags.includes(tag)
            ).slice(0, 5)
            setSuggestions(filtered)
            setShowSuggestions(filtered.length > 0)
        } else {
            setSuggestions([])
            setShowSuggestions(false)
        }
        setSelectedIndex(-1)
    }, [inputValue, allTags, tags])

    // 添加标签
    const addTag = useCallback((tag: string) => {
        const trimmed = tag.trim()
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed])
        }
        setInputValue('')
        setShowSuggestions(false)
        inputRef.current?.focus()
    }, [tags, onChange])

    // 删除标签
    const removeTag = useCallback((tagToRemove: string) => {
        onChange(tags.filter(tag => tag !== tagToRemove))
    }, [tags, onChange])

    // 键盘事件处理
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                addTag(suggestions[selectedIndex])
            } else if (inputValue.trim()) {
                addTag(inputValue)
            }
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1])
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => Math.max(prev - 1, -1))
        } else if (e.key === 'Escape') {
            setShowSuggestions(false)
        }
    }, [inputValue, tags, suggestions, selectedIndex, addTag, removeTag])

    return (
        <div className="space-y-3">
            {/* 标签列表 */}
            <div className="flex flex-wrap gap-2">
                <AnimatePresence mode="popLayout">
                    {tags.map(tag => (
                        <motion.span
                            key={tag}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            layout
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon-purple/20 text-neon-purple border border-neon-purple/30 text-sm"
                        >
                            <Tag className="w-3 h-3" />
                            {tag}
                            <button
                                onClick={() => removeTag(tag)}
                                className="ml-1 p-0.5 rounded-full hover:bg-neon-purple/30 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </motion.span>
                    ))}
                </AnimatePresence>
            </div>

            {/* 输入框 */}
            <div className="relative">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-nexus-bg-tertiary border border-nexus-border focus-within:border-neon-cyan/50 transition-colors">
                    <Plus className="w-4 h-4 text-nexus-text-muted" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => inputValue && setSuggestions.length > 0 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="输入标签并按 Enter 添加..."
                        className="flex-1 bg-transparent text-nexus-text-primary text-sm placeholder:text-nexus-text-muted focus:outline-none"
                    />
                </div>

                {/* 自动补全建议 */}
                <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-1 py-1 rounded-lg bg-nexus-bg-secondary border border-nexus-border shadow-xl z-10"
                        >
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={suggestion}
                                    onClick={() => addTag(suggestion)}
                                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${index === selectedIndex
                                            ? 'bg-neon-cyan/20 text-neon-cyan'
                                            : 'text-nexus-text-primary hover:bg-nexus-bg-tertiary'
                                        }`}
                                >
                                    <Tag className="w-3 h-3" />
                                    {suggestion}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
