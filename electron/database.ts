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
    ai_tags: string | null
    embedding: Buffer | null
    exif_data: string | null
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
            is_favorite INTEGER DEFAULT 0,
            ai_tags TEXT DEFAULT NULL,
            embedding BLOB DEFAULT NULL,
            exif_data TEXT DEFAULT NULL,
            md5_hash TEXT DEFAULT NULL,
            focus_score REAL DEFAULT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(type);
        CREATE INDEX IF NOT EXISTS idx_media_favorite ON media_items(is_favorite);
        CREATE INDEX IF NOT EXISTS idx_media_created ON media_items(created_at);
    `
    db.exec(schema)

    // 迁移：为现有数据库添加 AI 相关列（如果不存在）
    try {
        const columns = db.prepare("PRAGMA table_info(media_items)").all() as { name: string }[]
        const columnNames = columns.map(c => c.name)

        if (!columnNames.includes('ai_tags')) {
            db.exec('ALTER TABLE media_items ADD COLUMN ai_tags TEXT DEFAULT NULL')
            console.log('数据库迁移：添加 ai_tags 列')
        }

        if (!columnNames.includes('embedding')) {
            db.exec('ALTER TABLE media_items ADD COLUMN embedding BLOB DEFAULT NULL')
            console.log('数据库迁移：添加 embedding 列')
        }

        if (!columnNames.includes('exif_data')) {
            db.exec('ALTER TABLE media_items ADD COLUMN exif_data TEXT DEFAULT NULL')
            console.log('数据库迁移：添加 exif_data 列')
        }

        if (!columnNames.includes('md5_hash')) {
            db.exec('ALTER TABLE media_items ADD COLUMN md5_hash TEXT DEFAULT NULL')
            db.exec('CREATE INDEX IF NOT EXISTS idx_media_md5 ON media_items(md5_hash)')
            console.log('数据库迁移：添加 md5_hash 列')
        }

        if (!columnNames.includes('focus_score')) {
            db.exec('ALTER TABLE media_items ADD COLUMN focus_score REAL DEFAULT NULL')
            console.log('数据库迁移：添加 focus_score 列')
        }
    } catch (err) {
        console.error('数据库迁移失败:', err)
    }

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
 * 更新 AI 标签
 */
export function updateAiTags(id: number, aiTags: string[]): void {
    const tagsJson = JSON.stringify(aiTags)
    db.prepare('UPDATE media_items SET ai_tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(tagsJson, id)
}

/**
 * 更新 Embedding 向量
 */
export function updateEmbedding(id: number, embedding: number[]): void {
    // 将 float32 数组转换为 Buffer
    const buffer = Buffer.from(new Float32Array(embedding).buffer)
    db.prepare('UPDATE media_items SET embedding = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(buffer, id)
}

/**
 * 获取待 AI 处理的媒体项（只返回图片，没有 embedding 的）
 */
export function getPendingAiItems(limit: number = 10): MediaItemRecord[] {
    return db.prepare(`
        SELECT * FROM media_items 
        WHERE type = 'image' 
          AND thumbnail_path IS NOT NULL 
          AND embedding IS NULL 
        ORDER BY created_at DESC 
        LIMIT ?
    `).all(limit) as MediaItemRecord[]
}

/**
 * 获取所有有 embedding 的媒体项（用于语义搜索）
 */
export function getAllEmbeddings(): { id: number; path: string; embedding: Buffer }[] {
    return db.prepare(`
        SELECT id, path, embedding FROM media_items 
        WHERE embedding IS NOT NULL
    `).all() as { id: number; path: string; embedding: Buffer }[]
}

/**
 * 删除单个媒体项
 */
export function deleteMediaItem(id: number): boolean {
    const result = db.prepare('DELETE FROM media_items WHERE id = ?').run(id)
    return result.changes > 0
}

/**
 * 批量删除媒体项
 */
export function deleteMediaItems(ids: number[]): number {
    if (ids.length === 0) return 0

    const placeholders = ids.map(() => '?').join(',')
    const result = db.prepare(`DELETE FROM media_items WHERE id IN (${placeholders})`).run(...ids)
    return result.changes
}

/**
 * 批量更新标签（添加标签到多个项目）
 */
export function batchAddTags(ids: number[], tagsToAdd: string[]): number {
    if (ids.length === 0 || tagsToAdd.length === 0) return 0

    let updated = 0
    const selectStmt = db.prepare('SELECT id, tags FROM media_items WHERE id = ?')
    const updateStmt = db.prepare('UPDATE media_items SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')

    const transaction = db.transaction(() => {
        for (const id of ids) {
            const row = selectStmt.get(id) as { id: number; tags: string } | undefined
            if (row) {
                const existingTags: string[] = JSON.parse(row.tags || '[]')
                const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]))
                updateStmt.run(JSON.stringify(newTags), id)
                updated++
            }
        }
    })

    transaction()
    return updated
}

/**
 * 更新 EXIF 数据
 */
export function updateExifData(id: number, exifData: object): void {
    const exifJson = JSON.stringify(exifData)
    db.prepare('UPDATE media_items SET exif_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(exifJson, id)
}

/**
 * 获取待处理 EXIF 的媒体项（图片且没有 exif_data 的）
 */
export function getPendingExifItems(limit: number = 50): { id: number; path: string }[] {
    return db.prepare(`
        SELECT id, path FROM media_items 
        WHERE type = 'image' 
          AND exif_data IS NULL 
        ORDER BY created_at DESC 
        LIMIT ?
    `).all(limit) as { id: number; path: string }[]
}

// ==================== 清理助手相关函数 ====================

/**
 * 更新 MD5 哈希值
 */
export function updateMd5Hash(id: number, hash: string): void {
    db.prepare('UPDATE media_items SET md5_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(hash, id)
}

/**
 * 更新清晰度评分
 */
export function updateFocusScore(id: number, score: number): void {
    db.prepare('UPDATE media_items SET focus_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(score, id)
}

/**
 * 获取待计算 MD5 的媒体项
 */
export function getPendingMd5Items(limit: number = 50): { id: number; path: string }[] {
    return db.prepare(`
        SELECT id, path FROM media_items 
        WHERE md5_hash IS NULL 
        ORDER BY created_at DESC 
        LIMIT ?
    `).all(limit) as { id: number; path: string }[]
}

/**
 * 获取待计算清晰度的图片
 */
export function getPendingFocusItems(limit: number = 30): { id: number; path: string }[] {
    return db.prepare(`
        SELECT id, path FROM media_items 
        WHERE type = 'image' 
          AND focus_score IS NULL 
        ORDER BY created_at DESC 
        LIMIT ?
    `).all(limit) as { id: number; path: string }[]
}

/**
 * 获取精确重复文件（基于 MD5 哈希）
 */
export function getExactDuplicates(): { hash: string; count: number; totalSize: number; items: MediaItemRecord[] }[] {
    // 先找出有重复的哈希值
    const duplicateHashes = db.prepare(`
        SELECT md5_hash, COUNT(*) as count, SUM(size) as total_size
        FROM media_items 
        WHERE md5_hash IS NOT NULL 
        GROUP BY md5_hash 
        HAVING COUNT(*) > 1
        ORDER BY total_size DESC
    `).all() as { md5_hash: string; count: number; total_size: number }[]

    // 获取每个哈希值对应的所有文件
    const result: { hash: string; count: number; totalSize: number; items: MediaItemRecord[] }[] = []

    for (const dup of duplicateHashes) {
        const items = db.prepare(`
            SELECT * FROM media_items WHERE md5_hash = ? ORDER BY created_at ASC
        `).all(dup.md5_hash) as MediaItemRecord[]

        result.push({
            hash: dup.md5_hash,
            count: dup.count,
            totalSize: dup.total_size,
            items
        })
    }

    return result
}

/**
 * 获取所有有 embedding 的图片用于相似度分析
 */
export function getItemsWithEmbedding(): { id: number; path: string; embedding: Buffer; size: number }[] {
    return db.prepare(`
        SELECT id, path, embedding, size FROM media_items 
        WHERE type = 'image' AND embedding IS NOT NULL
        ORDER BY created_at DESC
    `).all() as { id: number; path: string; embedding: Buffer; size: number }[]
}

/**
 * 获取低质量图片（模糊或曝光异常）
 * @param threshold 清晰度阈值，低于此值视为模糊 (默认 100)
 */
export function getLowQualityItems(threshold: number = 100): MediaItemRecord[] {
    return db.prepare(`
        SELECT * FROM media_items 
        WHERE type = 'image' 
          AND focus_score IS NOT NULL 
          AND focus_score < ?
        ORDER BY focus_score ASC
    `).all(threshold) as MediaItemRecord[]
}

/**
 * 获取清理统计信息
 */
export function getCleanupStats(): {
    duplicateGroups: number
    duplicateFiles: number
    duplicateSize: number
    lowQualityCount: number
    totalCount: number
} {
    // 重复文件统计
    const dupStats = db.prepare(`
        SELECT COUNT(*) as groups, SUM(cnt - 1) as files, SUM(size_sum) as total_size
        FROM (
            SELECT md5_hash, COUNT(*) as cnt, SUM(size) as size_sum
            FROM media_items 
            WHERE md5_hash IS NOT NULL 
            GROUP BY md5_hash 
            HAVING COUNT(*) > 1
        )
    `).get() as { groups: number; files: number; total_size: number }

    // 低质量图片统计
    const lowQuality = db.prepare(`
        SELECT COUNT(*) as count FROM media_items 
        WHERE type = 'image' AND focus_score IS NOT NULL AND focus_score < 100
    `).get() as { count: number }

    // 总数
    const total = db.prepare('SELECT COUNT(*) as count FROM media_items').get() as { count: number }

    return {
        duplicateGroups: dupStats.groups || 0,
        duplicateFiles: dupStats.files || 0,
        duplicateSize: dupStats.total_size || 0,
        lowQualityCount: lowQuality.count || 0,
        totalCount: total.count || 0
    }
}

/**
 * 关闭数据库
 */
export function closeDatabase(): void {
    if (db) db.close()
}
