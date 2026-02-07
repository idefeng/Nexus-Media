# Nexus Media 社交圈层分析功能实现计划

该计划旨在利用本地 GPU 算力实现人脸识别、人物聚类及社交关系图谱分析。

## 1. 技术栈
- **后端 (Python)**: `insightface` (基于 ONNXRuntime-GPU), `scikit-learn` (DBSCAN 聚类)
- **数据库 (Electron)**: SQLite (`better-sqlite3`)
- **前端 (React)**: `react-force-graph` (社交图谱), `framer-motion` (动画)

## 2. 数据库变更 (SQLite)
### 新增 `persons` 表
- `id`: 主键
- `name`: 姓名（默认为 "未命名人物 X"）
- `cover_face_id`: 封面脸部 ID
- `created_at`: 创建时间
- `updated_at`: 更新时间

### 新增 `faces` 表
- `id`: 主键
- `media_id`: 关联的媒体 ID
- `person_id`: 关联的人物 ID (聚类确定)
- `embedding`: 特征向量 (512D BLOB)
- `bbox`: 人脸框坐标 (JSON: [x1, y1, x2, y2])
- `confidence`: 置信度
- `thumbnail_path`: 人脸缩略图路径
- `created_at`: 时间戳

## 3. Python 后端实现
### 初始化
- 安装 `insightface`, `onnxruntime-gpu`, `opencv-python`, `scikit-learn`。
- 下载 `buffalo_l` 模型包并设置 CUDA 提供程序。

### API 端点
- `/detect-faces`: 提取单张图片的人脸特征和坐标。
- `/cluster-faces`: 对数据库中所有未分类人脸进行 DBSCAN 聚类。
- `/get-social-graph`: 计算人物间的共同出现频率，生成节点和边。

## 4. 前端社交视图
### 导航
- 侧边栏新增 "人物" (Social) 入口。

### 人物墙 (People Wall)
- 圆形头像展示，支持点击重命名。
- 展示每个人物的照片总数。

### 社交图谱 (Social Graph)
- 力导向图展示人物关系。
- 节点：人物头像，大小由照片数决定。
- 边：连线粗细由共同出现次数决定。
- 交互：点击边筛选两人合影。

## 5. 任务分解
1. [x] 更新数据库 schema 及迁移逻辑。
2. [x] 更新 `requirements.txt` 并安装依赖 (正在验证环境)。
3. [x] 实现 Python `face_engine.py` 逻辑。
4. [x] 扩展 `main.py` 暴露人脸相关的 API。
5. [x] 扩展 Electron IPC 处理器。
6. [x] 开发前端 `PeoplePage` 和图谱组件。
