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
    width: number | null
    height: number | null
    duration: number | null
    md5_hash: string | null
    focus_score: number | null
    latitude: number | null
    longitude: number | null
}

export interface PersonRecord {
    id: number
    name: string
    cover_face_id: number | null
    created_at: string
    updated_at: string
    face_count?: number
    cover_thumbnail_path?: string | null
}

export interface FaceRecord {
    id: number
    media_id: number
    person_id: number | null
    embedding: Buffer
    bbox: string
    confidence: number
    thumbnail_path: string | null
    created_at: string
}

let db: Database.Database

/**
 * 初始化数据库
 */
export async function initDatabase(): Promise<void> {
    // 动态导入 config-store 以避免在 app ready 之前初始化
    const { configStore } = await import('./config-store')
    const dbPath = configStore.get('database.path')

    // 确保目录存在
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
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
            focus_score REAL DEFAULT NULL,
            latitude REAL DEFAULT NULL,
            longitude REAL DEFAULT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(type);
        CREATE INDEX IF NOT EXISTS idx_media_favorite ON media_items(is_favorite);
        CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(type);
        CREATE INDEX IF NOT EXISTS idx_media_favorite ON media_items(is_favorite);
        CREATE INDEX IF NOT EXISTS idx_media_created ON media_items(created_at);
        -- 针对智能扫描的索引 (尺寸 + 修改时间)
        CREATE INDEX IF NOT EXISTS idx_media_signature ON media_items(size, modified_time);

        CREATE TABLE IF NOT EXISTS persons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            cover_face_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS faces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_id INTEGER NOT NULL,
            person_id INTEGER,
            embedding BLOB NOT NULL,
            bbox TEXT NOT NULL,
            confidence REAL,
            thumbnail_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(media_id) REFERENCES media_items(id) ON DELETE CASCADE,
            FOREIGN KEY(person_id) REFERENCES persons(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_faces_media ON faces(media_id);
        CREATE INDEX IF NOT EXISTS idx_faces_person ON faces(person_id);
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

        if (!columnNames.includes('latitude')) {
            db.exec('ALTER TABLE media_items ADD COLUMN latitude REAL DEFAULT NULL')
            db.exec('CREATE INDEX IF NOT EXISTS idx_media_lat ON media_items(latitude)')
            console.log('数据库迁移：添加 latitude 列')
        }

        if (!columnNames.includes('longitude')) {
            db.exec('ALTER TABLE media_items ADD COLUMN longitude REAL DEFAULT NULL')
            db.exec('CREATE INDEX IF NOT EXISTS idx_media_lng ON media_items(longitude)')
            console.log('数据库迁移：添加 longitude 列')
        }

        // 补全已有数据的经纬度
        backfillLocationData()

        // 一次性重置 EXIF 数据，使用新引擎重新扫描
        const resetMarkerPath = path.join(dbDir, '.exif_reset_v2')
        if (!fs.existsSync(resetMarkerPath)) {
            console.log('>>> 重置 EXIF 数据，准备使用 exiftool-vendored 重新扫描...')
            const resetResult = db.prepare(`UPDATE media_items SET exif_data = NULL, latitude = NULL, longitude = NULL WHERE type = 'image'`).run()
            console.log(`>>> EXIF 重置完成: ${resetResult.changes} 条记录已标记为待重新扫描`)
            fs.writeFileSync(resetMarkerPath, new Date().toISOString())
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
 * 智能合并媒体项 (支持移动/重命名)
 * @returns { inserted: number, restored: number }
 */
export function smartMergeFiles(files: ScannedFile[]): { inserted: number, restored: number } {
    if (files.length === 0) return { inserted: 0, restored: 0 }

    let insertedCount = 0
    let restoredCount = 0

    // 预备语句
    const checkPath = db.prepare('SELECT id FROM media_items WHERE path = ?')
    const findCandidate = db.prepare('SELECT * FROM media_items WHERE size = ? AND modified_time = ?')

    // 更新原有记录的 SQL
    const updatePath = db.prepare(`
        UPDATE media_items 
        SET path = @path, 
            name = @name, 
            ext = @ext, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = @id
    `)

    // 插入新记录的 SQL
    const insert = db.prepare(`
        INSERT INTO media_items (
            path, name, size, type, ext, birth_time, modified_time
        ) VALUES (
            @path, @name, @size, @type, @ext, @birthTime, @modifiedTime
        )
    `)

    const transaction = db.transaction((items: ScannedFile[]) => {
        for (const item of items) {
            try {
                // 1. 检查路径是否已存在
                const existing = checkPath.get(item.path)
                if (existing) {
                    // 文件已存在，暂不更新元数据 (或者可以在这里更新 modified_time)
                    continue
                }

                // 2. 尝试寻找"丢失"的文件 (相同大小 + 相同修改时间)
                const modifiedTimeStr = item.modifiedTime instanceof Date ? item.modifiedTime.toISOString() : item.modifiedTime
                const candidates = findCandidate.all(item.size, modifiedTimeStr) as MediaItemRecord[]

                let matchFound = false

                for (const candidate of candidates) {
                    // 关键检查：如果候选记录的旧路径在磁盘上已经不存在了，说明这极大可能是移动操作
                    if (!fs.existsSync(candidate.path)) {
                        // 找到匹配！更新旧记录的路径
                        updatePath.run({
                            id: candidate.id,
                            path: item.path,
                            name: item.name,
                            ext: item.ext
                        })
                        matchFound = true
                        restoredCount++
                        // console.log(`[SmartScan] Recovered metadata: ${candidate.path} -> ${item.path}`)
                        break // 只要找到一个匹配就停止
                    }
                }

                // 3. 如果没找到匹配，作为新文件插入
                if (!matchFound) {
                    insert.run({
                        ...item,
                        birthTime: item.birthTime instanceof Date ? item.birthTime.toISOString() : item.birthTime,
                        modifiedTime: modifiedTimeStr
                    })
                    insertedCount++
                }

            } catch (err) {
                console.error('智能导入失败:', item.path, err)
            }
        }
    })

    transaction(files)
    return { inserted: insertedCount, restored: restoredCount }
}

/**
 * 批量插入媒体项 (旧版保留作为兼容)
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
export function getPendingThumbnailItems(limit: number = 500): { id: number; path: string; type: 'image' | 'video' }[] {
    return db.prepare('SELECT id, path, type FROM media_items WHERE thumbnail_path IS NULL LIMIT ?')
        .all(limit) as { id: number; path: string; type: 'image' | 'video' }[]
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
 * 获取所有带地理位置信息的媒体项
 */
export function getMediaWithLocation(): MediaItemRecord[] {
    return db.prepare('SELECT * FROM media_items WHERE latitude IS NOT NULL AND longitude IS NOT NULL').all() as MediaItemRecord[]
}

/**
 * 根据坐标范围搜索媒体
 */
export function searchMediaByBounds(north: number, south: number, east: number, west: number): MediaItemRecord[] {
    return db.prepare(`
        SELECT * FROM media_items 
        WHERE latitude <= ? AND latitude >= ? 
          AND longitude <= ? AND longitude >= ?
    `).all(north, south, east, west) as MediaItemRecord[]
}

/**
 * 获取媒体总数
 */
export function getMediaCount(): number {
    const result = db.prepare('SELECT COUNT(*) as count FROM media_items').get() as any
    return result.count
}

/**
 * 获取有 embedding 的图片总数
 */
export function getEmbeddingCount(): number {
    const result = db.prepare('SELECT COUNT(*) as count FROM media_items WHERE embedding IS NOT NULL').get() as any
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
    const rows = db.prepare('SELECT tags, ai_tags FROM media_items WHERE (tags IS NOT NULL AND tags != \'[]\') OR (ai_tags IS NOT NULL AND ai_tags != \'[]\')').all() as { tags: string, ai_tags: string | null }[]
    const tagSet = new Set<string>()

    for (const row of rows) {
        try {
            if (row.tags) {
                const tags = JSON.parse(row.tags) as string[]
                tags.forEach(tag => tagSet.add(tag))
            }
            if (row.ai_tags) {
                const aiTags = JSON.parse(row.ai_tags) as string[]
                aiTags.forEach(tag => tagSet.add(tag))
            }
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
 * 获取待分析 AI 数量
 */
export function getPendingAiCount(): number {
    const result = db.prepare(`
        SELECT COUNT(*) as count FROM media_items 
        WHERE type = 'image' 
          AND thumbnail_path IS NOT NULL 
          AND embedding IS NULL
    `).get() as { count: number }
    return result.count
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
 * 清空所有数据库记录 (危险操作)
 */
export function clearDatabase(): void {
    const transaction = db.transaction(() => {
        // 先删除从表
        db.prepare('DELETE FROM faces').run()

        // 删除主表
        db.prepare('DELETE FROM persons').run()
        db.prepare('DELETE FROM media_items').run()

        // 重置自增 ID
        db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('faces', 'persons', 'media_items')").run()
    })
    transaction()
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
export function updateExifData(id: number, exifData: any): void {
    const exifJson = JSON.stringify(exifData)
    const latitude = exifData?.latitude || null
    const longitude = exifData?.longitude || null

    db.prepare('UPDATE media_items SET exif_data = ?, latitude = ?, longitude = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(exifJson, latitude, longitude, id)
}

/**
 * 补全已有数据的经纬度
 */
function backfillLocationData() {
    console.log('检查并补全地理位置数据...')
    const items = db.prepare(`
        SELECT id, exif_data FROM media_items 
        WHERE (latitude IS NULL OR longitude IS NULL) AND exif_data IS NOT NULL
    `).all() as { id: number; exif_data: string }[]

    let count = 0
    const stmt = db.prepare('UPDATE media_items SET latitude = ?, longitude = ? WHERE id = ?')

    for (const item of items) {
        try {
            const data = JSON.parse(item.exif_data)
            if (data.latitude && data.longitude) {
                stmt.run(data.latitude, data.longitude, item.id)
                count++
            }
        } catch (e) {
            // ignore
        }
    }

    if (count > 0) {
        console.log(`位置数据补全完成: 更新了 ${count} 条记录`)
    }
}

/**
 * 获取待处理 EXIF 的媒体项
 * 包括：1) 尚未处理的；2) 处理过但数据为空的（需要重新扫描）
 */
export function getPendingExifItems(limit: number = 50): { id: number; path: string }[] {
    return db.prepare(`
        SELECT id, path FROM media_items 
        WHERE type = 'image' 
          AND (
            exif_data IS NULL 
            OR (exif_data = '{}' AND latitude IS NULL)
          )
        ORDER BY created_at DESC 
        LIMIT ?
    `).all(limit) as { id: number; path: string }[]
}

/**
 * 获取 EXIF 处理进度统计
 */
export function getExifStats(): { total: number; processed: number; pending: number; withGps: number } {
    const total = (db.prepare("SELECT COUNT(*) as count FROM media_items WHERE type = 'image'").get() as any).count
    const pending = (db.prepare(`
        SELECT COUNT(*) as count FROM media_items 
        WHERE type = 'image' 
          AND (
            exif_data IS NULL 
            OR (exif_data = '{}' AND latitude IS NULL)
          )
    `).get() as any).count
    const withGps = (db.prepare("SELECT COUNT(*) as count FROM media_items WHERE type = 'image' AND latitude IS NOT NULL").get() as any).count

    return {
        total,
        processed: total - pending,
        pending,
        withGps
    }
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
 * 获取有 embedding 的图片用于相似度分析（支持分页以节省内存）
 */
export function getItemsWithEmbedding(limit: number = 1000, offset: number = 0): { id: number; path: string; embedding: Buffer; size: number; created_at: string }[] {
    return db.prepare(`
        SELECT id, path, embedding, size, created_at FROM media_items 
        WHERE type = 'image' AND embedding IS NOT NULL
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `).all(limit, offset) as { id: number; path: string; embedding: Buffer; size: number; created_at: string }[]
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
 * 通用向量相似度搜索
 * @param targetEmbedding 目标向量 (CLIP 512维)
 * @param limit 返回结果数量
 * @param minQuality 最小清晰度分值 (可选)
 */
export function searchByEmbedding(targetEmbedding: number[], limit: number = 50, minQuality: number = 80): MediaItemRecord[] {
    const items = getItemsWithEmbedding()

    // 手动计算余弦相似度并排序
    // 注意：在资源极大的情况下应考虑采用 HNSW 等索引，但对于 10k 以下量级，内存计算很快
    const scored = items.map(item => {
        const itemEmbedding = new Float32Array(item.embedding.buffer)
        let dotProduct = 0
        let normA = 0
        let normB = 0

        for (let i = 0; i < targetEmbedding.length; i++) {
            dotProduct += targetEmbedding[i] * itemEmbedding[i]
            normA += targetEmbedding[i] * targetEmbedding[i]
            normB += itemEmbedding[i] * itemEmbedding[i]
        }

        const score = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
        return { ...item, score }
    })

    // 排序并取 Top K
    scored.sort((a, b) => b.score - a.score)
    const topScored = scored.slice(0, limit)

    // 根据 ID 获取完整记录
    const ids = topScored.map(s => s.id)
    if (ids.length === 0) return []

    const placeholders = ids.map(() => '?').join(',')
    return db.prepare(`
        SELECT * FROM media_items 
        WHERE id IN (${placeholders})
    `).all(...ids) as MediaItemRecord[]
}

/**
 * 增加一条创作记录（AI生成的图片）
 */
export function addCreation(item: {
    path: string;
    name: string;
    size: number;
    type: 'image';
    ext: string;
    tags: string;
    notes: string;
    width: number;
    height: number;
}): number {
    const stmt = db.prepare(`
        INSERT INTO media_items (
            path, name, size, type, ext, tags, notes, width, height, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
    `)

    const info = stmt.run(
        item.path,
        item.name,
        item.size,
        item.type,
        item.ext,
        item.tags,
        item.notes,
        item.width,
        item.height
    )

    return info.lastInsertRowid as number
}

/**
 * 创建一个新人物
 */
export function createPerson(name: string): number {
    const info = db.prepare('INSERT INTO persons (name) VALUES (?)').run(name)
    const id = info.lastInsertRowid as number

    // 如果名字包含占位符，更新为带 ID 的名字
    if (name === '未命名人物') {
        db.prepare('UPDATE persons SET name = ? WHERE id = ?').run(`未命名人物 #${id}`, id)
    }

    return id
}

/**
 * 增加人脸记录
 */
export function insertFace(face: Omit<FaceRecord, 'id' | 'created_at'>): number {
    const stmt = db.prepare(`
        INSERT INTO faces (media_id, person_id, embedding, bbox, confidence, thumbnail_path)
        VALUES (?, ?, ?, ?, ?, ?)
    `)
    const info = stmt.run(
        face.media_id,
        face.person_id,
        face.embedding,
        face.bbox,
        face.confidence,
        face.thumbnail_path
    )
    const faceId = info.lastInsertRowid as number

    // 如果该人物还没有封面图，设为封面
    if (face.person_id) {
        db.prepare(`
            UPDATE persons 
            SET cover_face_id = ? 
            WHERE id = ? AND cover_face_id IS NULL
        `).run(faceId, face.person_id)
    }

    return faceId
}

/**
 * 获取所有人物
 */
export function getAllPersons(): PersonRecord[] {
    return db.prepare(`
        SELECT p.*, COUNT(f.id) as face_count, 
               (SELECT thumbnail_path FROM faces WHERE id = p.cover_face_id) as cover_thumbnail_path
        FROM persons p
        LEFT JOIN faces f ON p.id = f.person_id
        GROUP BY p.id
        ORDER BY face_count DESC
    `).all() as PersonRecord[]
}

/**
 * 获取或创建人物
 */
export function getOrCreatePerson(name: string): number {
    const existing = db.prepare('SELECT id FROM persons WHERE name = ?').get(name) as { id: number } | undefined
    if (existing) return existing.id

    const info = db.prepare('INSERT INTO persons (name) VALUES (?)').run(name)
    return info.lastInsertRowid as number
}

/**
 * 更新人物名称
 */
export function updatePersonName(id: number, name: string): void {
    db.prepare('UPDATE persons SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, id)
}

/**
 * 获取未聚类的人脸
 */
export function getUnclusteredFaces(): FaceRecord[] {
    return db.prepare('SELECT * FROM faces WHERE person_id IS NULL').all() as FaceRecord[]
}

/**
 * 批量更新人脸的人物归属
 */
export function updateFacesPerson(faceIds: number[], personId: number): void {
    const stmt = db.prepare('UPDATE faces SET person_id = ? WHERE id = ?')
    const transaction = db.transaction((ids: number[], pid: number) => {
        for (const id of ids) stmt.run(pid, id)
    })
    transaction(faceIds, personId)
}

/**
 * 获取社交图谱数据
 */
export function getSocialGraphData() {
    // 节点：所有人物
    const persons = getAllPersons()

    // 边：统计不同人物出现在同一媒体中的次数
    const edges = db.prepare(`
        SELECT f1.person_id as source, f2.person_id as target, COUNT(*) as value
        FROM faces f1
        JOIN faces f2 ON f1.media_id = f2.media_id AND f1.person_id < f2.person_id
        WHERE f1.person_id IS NOT NULL AND f2.person_id IS NOT NULL
        GROUP BY f1.person_id, f2.person_id
    `).all() as { source: number; target: number; value: number }[]

    return { nodes: persons, links: edges }
}

/**
 * 获取两个人共同出现的媒体项
 */
export function getSharedMedia(personId1: number, personId2: number): MediaItemRecord[] {
    return db.prepare(`
        SELECT DISTINCT m.*
        FROM media_items m
        JOIN faces f1 ON m.id = f1.media_id
        JOIN faces f2 ON m.id = f2.media_id
        WHERE f1.person_id = ? AND f2.person_id = ?
    `).all(personId1, personId2) as MediaItemRecord[]
}

/**
 * 关闭数据库
 */
export function closeDatabase(): void {
    if (db) db.close()
}
