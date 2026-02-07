# Nexus Media - 地图模式 (Map Mode) 实施说明

## 1. 功能概述
地图模式允许用户根据媒体文件的 GPS 元数据在交互式地图上查看照片和视频。
- **足迹地图**: 全屏地图视图，支持标记聚合 (Marker Cluster)。
- **空间筛选**: 支持“框选”模式，当地图视野变化时自动筛选该区域内的媒体。
- **详情地图**: 在图片详情侧边栏中显示该位置的微型地图。
- **增强提取**: 使用 `exiftool-vendored` 提取更精确的坐标和视频元数据。

## 2. 后端变更
- **数据库扩展**: `media_items` 表新增了 `latitude` (REAL) 和 `longitude` (REAL) 列，并建立了索引。
- **自动迁移**: 应用启动时会自动检查并添加列，同时从现有的 `exif_data` JSON 中补全经纬度。
- **高性能查询**:
    - `getMediaWithLocation()`: 获取所有带坐标的媒体。
    - `searchMediaByBounds(north, south, east, west)`: 极速执行矩形区域搜索。
- **元数据引擎**: 替换 `exifr` 为 `exiftool-vendored`，显著提升了对各类图片格式（HEIC, RAW等）及视频 GPS 的支持。

## 3. 前端集成
- **组件架构**:
    - `MapDashboard`: 主地图组件，集成了 `react-leaflet` 和 `leaflet.markercluster`。
    - `MapBoundsListener`: 监听地图交互并触发筛选逻辑。
    - `MetadataSidebar`: 详情侧边栏集成微型 Leaflet 地图。
- **类型同步**: 更新了 `vite-env.d.ts` 和 `src/types`，确保地理信息在整个链路中的类型安全。
- **国际化**: 已通过 `zh/translation.json` 提供完整的中文支持。

## 4. 依赖项 (已安装)
- `leaflet`: 地图核心库。
- `react-leaflet`: React 地图封装。
- `leaflet.markercluster`: 标记聚合插件。
- `exiftool-vendored`: 工业级元数据提取工具。

## 5. 待办事项 / 后续优化
- [ ] 离线地图支持 (需要瓦片服务器或预下载)。
- [ ] 根据地点名称搜索 (Reverse Geocoding)。
- [ ] 地图热力图模式。
