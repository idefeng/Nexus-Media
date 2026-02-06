/**
 * 数据库模块 - 使用 Better-SQLite3
 * 负责底层数据持久化和查询优化
 */
import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { ScannedFile } from './scanner'

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

let db: Database.Database

/**
 * 初始化数据库
 */
export async function initDatabase(): Promise<void> {
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'nexus_media.db')

    // 确保目录存在
    if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true })
    }

    db = new Database(dbPath)

    // 执行架构初始化
    // 注意：SQLite 不支持直接修改列名或删除列，如果需要生产环境迁移请使用迁移工具
    // 这里我们先确保基础表结构正确
    const schema = `
        CREATE TABLE IF NOT EXISTS media_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            size INTEGER,
            type TEXT CHECK(type IN ('image', 'video')) NOT NULL,
            ext TEXT,
            birth_time DATETIME,
            modified_time DATETIME,
            tags TEXT DEFAULT '[]',
            notes TEXT DEFAULT '',
            thumbnail_path TEXT,
            width INTEGER,
            height INTEGER,
            duration INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_favorite INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(type);
        CREATE INDEX IF NOT EXISTS idx_media_favorite ON media_items(is_favorite);
        CREATE INDEX IF NOT EXISTS idx_media_created ON media_items(created_at);
    `
    db.exec(schema)
    console.log('Better-SQLite3 数据库已连接:', dbPath)
}

/**
 * 获取所有媒体项
 */
export function getAllMediaItems(): MediaItemRecord[] {
    return db.prepare('SELECT * FROM media_items ORDER BY created_at DESC').all() as MediaItemRecord[]
}

/**
 * 批量插入媒体项
 */
export function insertMediaItems(files: ScannedFile[]): number {
    if (files.length === 0) return 0

    const insert = db.prepare(`
        INSERT OR IGNORE INTO media_items (
            path, name, size, type, ext, birth_time, modified_time
        ) VALUES (
            @path, @name, @size, @type, @ext, @birthTime, @modifiedTime
        )
    `)

    let insertedCount = 0
    const transaction = db.transaction((items: ScannedFile[]) => {
        for (const item of items) {
            try {
                const result = insert.run({
                    ...item,
                    birthTime: item.birthTime instanceof Date ? item.birthTime.toISOString() : item.birthTime,
                    modifiedTime: item.modifiedTime instanceof Date ? item.modifiedTime.toISOString() : item.modifiedTime
                })
                if (result.changes > 0) insertedCount++
            } catch (err) {
                console.error('插入数据库失败:', item.path, err)
            }
        }
    })

    transaction(files)
    return insertedCount
}

/**
 * 更新媒体项的缩略图路径
 */
export function updateThumbnailPath(id: number, thumbnailPath: string): void {
    db.prepare('UPDATE media_items SET thumbnail_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(thumbnailPath, id)
}

/**
 * 获取待处理缩略图的任务（没有缩略图的项）
 */
export function getPendingThumbnailItems(): { id: number; path: string; type: 'image' | 'video' }[] {
    return db.prepare('SELECT id, path, type FROM media_items WHERE thumbnail_path IS NULL')
        .all() as { id: number; path: string; type: 'image' | 'video' }[]
}

/**
 * 获取媒体统计
 */
export function getMediaStats() {
    const images = db.prepare("SELECT COUNT(*) as count FROM media_items WHERE type = 'image'").get() as any
    const videos = db.prepare("SELECT COUNT(*) as count FROM media_items WHERE type = 'video'").get() as any
    return {
        images: images.count,
        videos: videos.count,
        total: images.count + videos.count
    }
}

/**
 * 获取媒体总数
 */
export function getMediaCount(): number {
    const result = db.prepare('SELECT COUNT(*) as count FROM media_items').get() as any
    return result.count
}

/**
 * 切换收藏
 */
export function toggleFavorite(id: number): boolean {
    db.prepare('UPDATE media_items SET is_favorite = 1 - is_favorite, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(id)
    return true
}

/**
 * 更新标签
 */
export function updateTags(id: number, tags: string[]): void {
    const tagsJson = JSON.stringify(tags)
    db.prepare('UPDATE media_items SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(tagsJson, id)
}

/**
 * 更新备注
 */
export function updateNotes(id: number, notes: string): void {
    db.prepare('UPDATE media_items SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(notes, id)
}

/**
 * 获取所有唯一标签（用于自动补全）
 */
export function getAllTags(): string[] {
    const rows = db.prepare('SELECT tags FROM media_items WHERE tags IS NOT NULL AND tags != \'[]\'').all() as { tags: string }[]
    const tagSet = new Set<string>()

    for (const row of rows) {
        try {
            const tags = JSON.parse(row.tags) as string[]
            tags.forEach(tag => tagSet.add(tag))
        } catch {
            // 忽略解析错误
        }
    }

    return Array.from(tagSet).sort()
}

/**
 * 获取单个媒体项
 */
export function getMediaItem(id: number): MediaItemRecord | null {
    return db.prepare('SELECT * FROM media_items WHERE id = ?').get(id) as MediaItemRecord | null
}

/**
 * 关闭数据库
 */
export function closeDatabase(): void {
    if (db) db.close()
}
