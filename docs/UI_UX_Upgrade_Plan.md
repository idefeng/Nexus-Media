# UI/UX Pro Max 升级计划 - Modern AI Dashboard

## 1. 目标与设计理念
本项目旨在为 Nexus Media 打造一个极具现代感、科技感的 AI 仪表盘界面。
- **核心布局**: Bento Box (便当盒) 风格，模块化卡片，大小不一，灵活展示信息。
- **视觉风格**:
    - **质感**: 磨砂玻璃 (Glassmorphism)，背景模糊 (Backdrop Blur 20px)。
    - **配色**: 
        - 基底: 石墨灰 (Graphite Gray, #121212 - #1C1C1E)。
        - 强调: 电子蓝 (Electric Blue, #2997FF) 作为主要动作色。
    - **字体**: UI 使用 Inter，元数据使用 JetBrains Mono (等宽字体)。
- **交互**: 
    - 顶部持久化 "Command-K" 搜索栏。
    - 动态微交互与悬停效果。

## 2. 实施细节

### 2.1 样式系统 (Tailwind Config)
- 更新了 `tailwind.config.js`:
    - 新增 `nexus-bg` 系列颜色为石墨灰阶。
    - 新增 `neon-electric` (#2997FF) 强调色。
    - 定义 `font-mono` 为 `JetBrains Mono`。

### 2.2 仪表盘组件 (Dashboard.tsx)
- 创建了全新的 `Dashboard` 组件。
- 采用 Bento Grid 布局 (`grid-cols-4`, `auto-rows-[160px]`)。
- 包含模块:
    - **Welcome Card**: 2x1 尺寸，展示欢迎语和快速入口。
    - **Quick Stats**: 1x1 尺寸，展示总数、收藏数。
    - **Recent Gallery**: 2x2 大尺寸，展示最近上传的 4 张图片/视频缩略图，带有悬停预览效果。
    - **Type Stats**: 1x1 尺寸，分类统计。
    - **AI Insights**: 2x1 尺寸，展示 AI 分析入口。
    - **Storage**: 1x1 尺寸，展示存储空间使用情况。

### 2.3 顶部导航栏 (TopBar.tsx)
- 重新设计为 "Command-K" 风格。
- 搜索框居中、加宽，具有磨砂玻璃背景。
- 添加 `⌘K` / `Ctrl+K` 快捷键监听，自动聚焦搜索框。
- 视觉上添加了键盘快捷键提示徽章。

### 2.4 侧边栏 (Sidebar.tsx)
- 导航菜单新增 "仪表盘" (Dashboard) 入口。
- 保持磨砂玻璃效果与整体风格一致。

### 2.5 集成 (App.tsx)
- 更新路由逻辑，默认视图设为 `dashboard`。
- 集成 `Dashboard` 组件及其数据流。

## 3. 下一步计划
- **AI 智能标签**: 进一步完善 AI Insights 卡片的实际功能 linkage。
- **数据可视化**: 引入图表库 (如 Recharts) 展示更详细的存储和分类趋势。
- **自定义布局**: 允许用户拖拽调整 Bento Grid 的卡片位置。
