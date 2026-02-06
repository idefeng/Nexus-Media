-- Nexus Media 数据库架构
-- 媒体资源表

CREATE TABLE IF NOT EXISTS media_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,                              -- 文件完整路径
    type TEXT CHECK(type IN ('image', 'video')) NOT NULL,   -- 资源类型
    tags TEXT DEFAULT '[]',                                 -- 标签 (JSON 数组)
    notes TEXT DEFAULT '',                                  -- 备注
    thumbnail_path TEXT,                                    -- 缩略图路径
    file_name TEXT NOT NULL,                                -- 文件名
    file_size INTEGER,                                      -- 文件大小 (字节)
    width INTEGER,                                          -- 宽度
    height INTEGER,                                         -- 高度
    duration INTEGER,                                       -- 视频时长 (秒)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,          -- 创建时间
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,          -- 更新时间
    is_favorite INTEGER DEFAULT 0                           -- 是否收藏
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(type);
CREATE INDEX IF NOT EXISTS idx_media_favorite ON media_items(is_favorite);
CREATE INDEX IF NOT EXISTS idx_media_created ON media_items(created_at);
CREATE INDEX IF NOT EXISTS idx_media_tags ON media_items(tags);
