# Nexus Media

Nexus Media 是一款基于 Electron 构建的下一代多媒体资源管理器，旨在利用 AI 技术为用户提供智能化的多媒体整理、搜索和创作体验。

## ✨ 核心特性

-   **智能管理**：自动扫描指定目录，支持多种媒体格式。
-   **AI 字幕与标签**：集成 AI 引擎，自动分析媒体内容，生成标签和描述。
-   **EXIF 元数据处理**：深度集成 `exiftool`，获取拍摄日期、地点、相机信息等元数据。
-   **人脸识别与聚类**：内置人脸识别引擎，支持按人物分类浏览（开发中）。
-   **交互式地图视图**：基于 Leaflet，将您的照片和视频在地图上直观展现。
-   **现代化 UI**：采用 Minimalist Swiss Design / Clean Tech 设计风格，提供极致的视觉体验。
-   **高性能数据库**：使用 SQLite (better-sqlite3) 存储大规模元数据，确保快速搜索。
-   **多语言支持**：内置完善的国际化支持（i18n）。

## 🚀 快速开始

### 环境依赖

-   Node.js (建议 v18+)
-   Python 3.9+ (用于 AI 引擎)
-   CUDA (可选，用于 AI 加速)

### 安装步骤

1.  **克隆仓库**
    ```bash
    git clone https://github.com/idefeng/Nexus-Media.git
    cd Nexus-Media
    ```

2.  **安装 Node.js 依赖**
    ```bash
    pnpm install
    ```

3.  **配置 AI 引擎**
    ```bash
    cd ai_engine
    python -m venv .venv
    source .venv/bin/activate  # Windows 使用 .venv\Scripts\activate
    pip install -r requirements.txt
    ```

### 开发环境运行

```bash
pnpm dev
```

### 构建安装包

```bash
pnpm build
```

## 🛠️ 技术栈

-   **前端**: React, Vite, Lucide React, Framer Motion, TailwindCSS
-   **后端**: Electron, better-sqlite3
-   **AI**: Python, PyTorch (DeepSeek/CLIP/Face Recognition)
-   **工具**: FFmpeg, ExifTool

## 📝 开发计划

-   [x] 现代化 Dashboard 界面
-   [x] 基础媒体检索与预览
-   [x] EXIF 元数据提取
-   [ ] AI 智能剪辑与拼贴
-   [ ] 跨设备同步 (私有云)

## 📄 许可

本项目采用 [MIT](LICENSE) 协议。

---

*Powered by Nexus Team with Love.*
