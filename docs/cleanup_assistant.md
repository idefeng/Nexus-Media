# 清理助手功能实现文档

## 功能概述

清理助手（Cleanup Assistant）是 Nexus Media 的核心模块之一，用于帮助用户管理硬盘上的冗余数据。

## 已实现功能

### 1. 精确重复检测 (Exact Duplicate Detection)
- **技术方案**: 使用 MD5 哈希计算文件内容特征
- **后台处理**: 每 15 秒自动批量处理待计算的文件
- **数据存储**: `md5_hash` 列存储在数据库中，建立索引加速查询
- **分组展示**: 相同哈希值的文件自动分组，默认保留第一个（最早创建的）

### 2. 近似重复检测 (Near-Duplicate Detection)
- **技术方案**: 使用 CLIP Embedding + 余弦相似度
- **相似度阈值**: 默认 0.95（95% 以上视为"连拍"或高度相似）
- **分组算法**: 使用并查集（Union-Find）进行聚类
- **展示方式**: 可左右滑动查看同组图片，显示相似度百分比

### 3. 模糊/低质量检测 (Blurry & Low-Quality Detection)
- **技术方案**: Laplacian 算子计算方差（Focus Score）
- **Python API**: `/focus-score` 和 `/batch-focus-score` 端点
- **判断标准**:
  - Focus Score < 100 → 模糊
  - 亮度 < 50 → 过暗
  - 亮度 > 200 → 过曝
- **数据存储**: `focus_score` 列存储评分

### 4. 清理仪表盘 UI (Cleanup Dashboard)
- **统计卡片**: 重复文件数、相似照片组、低质量图片、可节省空间
- **标签页切换**: 精确重复、相似照片、低质量
- **交互设计**:
  - 重复文件组可展开查看详情
  - 相似照片支持左右切换预览
  - 低质量图片以网格形式展示
- **批量操作**:
  - 全选当前页
  - 取消全部选择
  - 一键清理（移动到回收站）

## 数据库变更

新增字段:
```sql
ALTER TABLE media_items ADD COLUMN md5_hash TEXT DEFAULT NULL;
ALTER TABLE media_items ADD COLUMN focus_score REAL DEFAULT NULL;
ALTER TABLE media_items ADD COLUMN exif_data TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_media_md5 ON media_items(md5_hash);
```

## API 接口

### Electron IPC
- `cleanup:analyze` - 执行完整清理分析
- `cleanup:getStats` - 获取清理统计信息
- `cleanup:trashItems` - 批量移动到回收站
- `cleanup:calculateFocusScore` - 计算单张图片清晰度

### Python AI Engine
- `POST /focus-score` - 计算单张图片清晰度
- `POST /batch-focus-score` - 批量计算清晰度

## 文件结构

```
electron/
├── cleanup.ts          # 清理助手核心逻辑（MD5、相似度计算）
├── exif.ts             # EXIF 元数据提取
├── database.ts         # 新增清理相关数据库函数
└── main.ts             # 后台任务调度

ai_engine/
└── main.py             # 新增 focus-score API

src/components/cleanup/
├── CleanupDashboard.tsx  # 清理仪表盘主组件
└── index.ts              # 导出
```

## 国际化

已添加翻译键（中文、英文）:
- `sidebar.cleanup`
- `cleanup.title`
- `cleanup.description`
- `cleanup.duplicates` / `cleanup.similar` / `cleanup.lowquality`
- 等...

## 导航入口

侧边栏新增"清理助手"菜单项，点击进入清理仪表盘。

## 安全机制

- 所有删除操作使用 `shell.trashItem()` 移动到系统回收站
- 删除前显示预览确认界面
- 默认保留每组的第一个文件（通常是原始文件）
