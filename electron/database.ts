/**
 * 数据库模块
 * 临时使用内存存储实现，后续可替换为 SQLite
 */
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { ScannedFile } from './scanner'

// 媒体项数据库记录接口
export interface MediaItemRecord {
    id: number
    path: string
    name: string
    size: number
    type: 'image' | 'video'
    ext: string
    birth_time: string
    modified_time: string
    tags: string
    notes: string
    thumbnail_path: string | null
    is_favorite: number
    created_at: string
    updated_at: string
}

// 内存存储
let mediaItems: MediaItemRecord[] = []
let nextId = 1
let dataFilePath: string = ''

// 获取数据文件路径
function getDataFilePath(): string {
    if (dataFilePath) return dataFilePath
    const userDataPath = app.getPath('userData')
    dataFilePath = path.join(userDataPath, 'nexus_media_data.json')
    return dataFilePath
}

// 从 JSON 文件加载数据
function loadFromFile(): void {
    try {
        const filePath = getDataFilePath()
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8')
            const parsed = JSON.parse(data)
            mediaItems = parsed.items || []
            nextId = parsed.nextId || 1
            console.log(`从文件加载了 ${mediaItems.length} 个媒体项`)
        }
    } catch (error) {
        console.error('加载数据失败:', error)
        mediaItems = []
        nextId = 1
    }
}

// 保存数据到 JSON 文件
function saveToFile(): void {
    try {
        const filePath = getDataFilePath()
        const dir = path.dirname(filePath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(filePath, JSON.stringify({ items: mediaItems, nextId }, null, 2))
    } catch (error) {
        console.error('保存数据失败:', error)
    }
}

// 初始化数据库
export async function initDatabase(): Promise<void> {
    loadFromFile()
    console.log('数据库初始化完成 (内存模式)')
}

// 关闭数据库
export function closeDatabase(): void {
    saveToFile()
    console.log('数据已保存')
}

/**
 * 批量插入媒体项（跳过已存在的路径）
 */
export function insertMediaItems(files: ScannedFile[]): number {
    if (files.length === 0) return 0

    const existingPaths = new Set(mediaItems.map(item => item.path))
    const now = new Date().toISOString()
    let insertedCount = 0

    for (const file of files) {
        if (existingPaths.has(file.path)) continue

        const record: MediaItemRecord = {
            id: nextId++,
            path: file.path,
            name: file.name,
            size: file.size,
            type: file.type,
            ext: file.ext,
            birth_time: file.birthTime.toISOString(),
            modified_time: file.modifiedTime.toISOString(),
            tags: '[]',
            notes: '',
            thumbnail_path: null,
            is_favorite: 0,
            created_at: now,
            updated_at: now
        }

        mediaItems.push(record)
        existingPaths.add(file.path)
        insertedCount++
    }

    // 异步保存到文件
    if (insertedCount > 0) {
        setImmediate(() => saveToFile())
    }

    return insertedCount
}

/**
 * 检查路径是否已存在
 */
export function pathExists(filePath: string): boolean {
    return mediaItems.some(item => item.path === filePath)
}

/**
 * 获取所有媒体项
 */
export function getAllMediaItems(): MediaItemRecord[] {
    // 按创建时间降序排列
    return [...mediaItems].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
}

/**
 * 获取媒体项总数
 */
export function getMediaCount(): number {
    return mediaItems.length
}

/**
 * 获取按类型分组的统计
 */
export function getMediaStats(): { images: number; videos: number; total: number } {
    const images = mediaItems.filter(item => item.type === 'image').length
    const videos = mediaItems.filter(item => item.type === 'video').length
    return { images, videos, total: images + videos }
}

/**
 * 切换收藏状态
 */
export function toggleFavorite(id: number): boolean {
    const item = mediaItems.find(item => item.id === id)
    if (!item) return false

    item.is_favorite = item.is_favorite === 0 ? 1 : 0
    item.updated_at = new Date().toISOString()

    setImmediate(() => saveToFile())
    return true
}

/**
 * 删除媒体项
 */
export function deleteMediaItem(id: number): boolean {
    const index = mediaItems.findIndex(item => item.id === id)
    if (index === -1) return false

    mediaItems.splice(index, 1)
    setImmediate(() => saveToFile())
    return true
}
