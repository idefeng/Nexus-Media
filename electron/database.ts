/**
 * 数据库模块 - 使用 sql.js (纯 JavaScript SQLite)
 * 负责底层数据持久化和查询优化
 * 
 * sql.js 是一个编译为 WebAssembly 的 SQLite 实现，无需原生编译
 */
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
    embedding: Uint8Array | null
}

let db: any = null
let dbPath: string = ''
let initPromise: Promise<void> | null = null

/**
 * 保存数据库到文件
 */
function saveDatabase(): void {
    if (db && dbPath) {
        try {
            const data = db.export()
            const buffer = Buffer.from(data)
            fs.writeFileSync(dbPath, buffer)
        } catch (err) {
            console.error('保存数据库失败:', err)
        }
    }
}

/**
 * 获取 sql.js WASM 文件路径
 */
function getWasmPath(): string {
    // 尝试多个可能的位置
    const possiblePaths = [
        // pnpm 安装路径
        path.join(__dirname, '../node_modules/.pnpm/sql.js@1.13.0/node_modules/sql.js/dist/sql-wasm.wasm'),
        path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm'),
        // require.resolve 方式
        path.join(path.dirname(require.resolve('sql.js/package.json')), 'dist', 'sql-wasm.wasm'),
    ]

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            console.log('找到 WASM 文件:', p)
            return p
        }
    }

    // 如果都找不到，返回一个默认路径
    const defaultPath = path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm')
    console.log('使用默认 WASM 路径:', defaultPath)
    return defaultPath
}

/**
 * 初始化数据库
 */
export async function initDatabase(): Promise<void> {
    // 如果已经初始化过，返回已有的 promise
    if (initPromise) return initPromise

    initPromise = (async () => {
        try {
            // 使用 require 动态加载 sql.js
            const initSqlJs = require('sql.js')

            // 获取 WASM 文件并读取为 buffer
            const wasmPath = getWasmPath()
            const wasmBinary = fs.readFileSync(wasmPath)

            const SQL = await initSqlJs({
                wasmBinary: wasmBinary
            })

            const userDataPath = app.getPath('userData')
            dbPath = path.join(userDataPath, 'nexus_media.db')

            // 确保目录存在
            if (!fs.existsSync(userDataPath)) {
                fs.mkdirSync(userDataPath, { recursive: true })
            }

            // 加载或创建数据库
            if (fs.existsSync(dbPath)) {
                const fileBuffer = fs.readFileSync(dbPath)
                db = new SQL.Database(fileBuffer)
                console.log('sql.js 数据库已加载:', dbPath)
            } else {
                db = new SQL.Database()
                console.log('sql.js 数据库已创建:', dbPath)
            }

            // 执行架构初始化
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
                    embedding BLOB DEFAULT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(type);
                CREATE INDEX IF NOT EXISTS idx_media_favorite ON media_items(is_favorite);
                CREATE INDEX IF NOT EXISTS idx_media_created ON media_items(created_at);
            `
            db.run(schema)
            saveDatabase()

            console.log('sql.js 数据库初始化完成')
        } catch (err) {
            console.error('数据库初始化失败:', err)
            throw err
        }
    })()

    return initPromise
}

/**
 * 辅助函数：执行查询并返回所有结果
 */
function queryAll(sql: string, params: any[] = []): any[] {
    if (!db) {
        console.error('数据库未初始化，无法执行查询')
        return []
    }
    try {
        const stmt = db.prepare(sql)
        stmt.bind(params)
        const results: any[] = []
        while (stmt.step()) {
            const row = stmt.getAsObject()
            results.push(row)
        }
        stmt.free()
        return results
    } catch (err) {
        console.error('查询失败:', sql, err)
        return []
    }
}

/**
 * 辅助函数：执行查询并返回第一行
 */
function queryOne(sql: string, params: any[] = []): any | null {
    const results = queryAll(sql, params)
    return results.length > 0 ? results[0] : null
}

/**
 * 辅助函数：执行更新语句
 */
function execute(sql: string, params: any[] = []): { changes: number } {
    if (!db) {
        console.error('数据库未初始化，无法执行更新')
        return { changes: 0 }
    }
    try {
        db.run(sql, params)
        const changes = db.getRowsModified()
        saveDatabase()
        return { changes }
    } catch (err) {
        console.error('执行失败:', sql, err)
        return { changes: 0 }
    }
}

/**
 * 获取所有媒体项
 */
export function getAllMediaItems(): MediaItemRecord[] {
    return queryAll('SELECT * FROM media_items ORDER BY created_at DESC')
}

/**
 * 批量插入媒体项
 */
export function insertMediaItems(files: ScannedFile[]): number {
    if (files.length === 0 || !db) return 0

    let insertedCount = 0

    for (const item of files) {
        try {
            const birthTime = item.birthTime instanceof Date ? item.birthTime.toISOString() : item.birthTime
            const modifiedTime = item.modifiedTime instanceof Date ? item.modifiedTime.toISOString() : item.modifiedTime

            db.run(`
                INSERT OR IGNORE INTO media_items (
                    path, name, size, type, ext, birth_time, modified_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [item.path, item.name, item.size, item.type, item.ext, birthTime, modifiedTime])

            if (db.getRowsModified() > 0) insertedCount++
        } catch (err) {
            console.error('插入数据库失败:', item.path, err)
        }
    }

    if (insertedCount > 0) saveDatabase()
    return insertedCount
}

/**
 * 更新媒体项的缩略图路径
 */
export function updateThumbnailPath(id: number, thumbnailPath: string): void {
    execute('UPDATE media_items SET thumbnail_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [thumbnailPath, id])
}

/**
 * 获取待处理缩略图的任务（没有缩略图的项）
 */
export function getPendingThumbnailItems(): { id: number; path: string; type: 'image' | 'video' }[] {
    return queryAll('SELECT id, path, type FROM media_items WHERE thumbnail_path IS NULL')
}

/**
 * 获取媒体统计
 */
export function getMediaStats() {
    const images = queryOne("SELECT COUNT(*) as count FROM media_items WHERE type = 'image'")
    const videos = queryOne("SELECT COUNT(*) as count FROM media_items WHERE type = 'video'")
    return {
        images: images?.count || 0,
        videos: videos?.count || 0,
        total: (images?.count || 0) + (videos?.count || 0)
    }
}

/**
 * 获取媒体总数
 */
export function getMediaCount(): number {
    const result = queryOne('SELECT COUNT(*) as count FROM media_items')
    return result?.count || 0
}

/**
 * 切换收藏
 */
export function toggleFavorite(id: number): boolean {
    execute('UPDATE media_items SET is_favorite = 1 - is_favorite, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id])
    return true
}

/**
 * 更新标签
 */
export function updateTags(id: number, tags: string[]): void {
    const tagsJson = JSON.stringify(tags)
    execute('UPDATE media_items SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [tagsJson, id])
}

/**
 * 更新备注
 */
export function updateNotes(id: number, notes: string): void {
    execute('UPDATE media_items SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [notes, id])
}

/**
 * 获取所有唯一标签（用于自动补全）
 */
export function getAllTags(): string[] {
    const rows = queryAll("SELECT tags FROM media_items WHERE tags IS NOT NULL AND tags != '[]'")
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
    return queryOne('SELECT * FROM media_items WHERE id = ?', [id])
}

/**
 * 更新 AI 标签
 */
export function updateAiTags(id: number, aiTags: string[]): void {
    const tagsJson = JSON.stringify(aiTags)
    execute('UPDATE media_items SET ai_tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [tagsJson, id])
}

/**
 * 更新 Embedding 向量
 */
export function updateEmbedding(id: number, embedding: number[]): void {
    // 将 float32 数组转换为 Uint8Array
    const buffer = new Uint8Array(new Float32Array(embedding).buffer)
    execute('UPDATE media_items SET embedding = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [buffer, id])
}

/**
 * 获取待 AI 处理的媒体项（只返回图片，没有 embedding 的）
 */
export function getPendingAiItems(limit: number = 10): MediaItemRecord[] {
    return queryAll(`
        SELECT * FROM media_items 
        WHERE type = 'image' 
          AND thumbnail_path IS NOT NULL 
          AND embedding IS NULL 
        ORDER BY created_at DESC 
        LIMIT ?
    `, [limit])
}

/**
 * 获取所有有 embedding 的媒体项（用于语义搜索）
 */
export function getAllEmbeddings(): { id: number; path: string; embedding: Uint8Array }[] {
    return queryAll(`
        SELECT id, path, embedding FROM media_items 
        WHERE embedding IS NOT NULL
    `)
}

/**
 * 删除单个媒体项
 */
export function deleteMediaItem(id: number): boolean {
    const result = execute('DELETE FROM media_items WHERE id = ?', [id])
    return result.changes > 0
}

/**
 * 批量删除媒体项
 */
export function deleteMediaItems(ids: number[]): number {
    if (ids.length === 0) return 0

    const placeholders = ids.map(() => '?').join(',')
    const result = execute(`DELETE FROM media_items WHERE id IN (${placeholders})`, ids)
    return result.changes
}

/**
 * 批量更新标签（添加标签到多个项目）
 */
export function batchAddTags(ids: number[], tagsToAdd: string[]): number {
    if (ids.length === 0 || tagsToAdd.length === 0) return 0

    let updated = 0

    for (const id of ids) {
        const row = queryOne('SELECT id, tags FROM media_items WHERE id = ?', [id])
        if (row) {
            const existingTags: string[] = JSON.parse(row.tags || '[]')
            const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]))
            execute('UPDATE media_items SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [JSON.stringify(newTags), id])
            updated++
        }
    }

    return updated
}

/**
 * 关闭数据库
 */
export function closeDatabase(): void {
    if (db) {
        saveDatabase()
        db.close()
        db = null
    }
    initPromise = null
}
