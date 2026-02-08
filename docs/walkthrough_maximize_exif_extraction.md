# 修复报告：改进 EXIF 提取以实现信息最大化

## 修复概述
参考了 [标点符 - Python 获取图片 EXIF 信息](https://www.biaodianfu.com/exif-python.html) 的最佳实践，我对 `electron/exif.ts` 进行了改进，显著扩展了元数据提取的深度和广度。

## 改进内容

### 1. 扩展 `ExifData` 接口
增加了 15+ 个新字段，涵盖了专业的摄影参数：
-   **硬件信息**：`lensModel` (镜头型号), `serialNumber` (机身序列号)。
-   **曝光参数**：`exposureBias` (曝光补偿), `meteringMode` (测光模式), `exposureProgram` (曝光程序)。
-   **画质信息**：`whiteBalance` (白平衡), `colorSpace` (色彩空间), `bitDepth` (位深)。
-   **扩展时间戳**：`modifyDate` (修改日期), `createDate` (创建日期), `gpsDateStamp` (GPS 日期戳)。
-   **文件元数据**：`fileSize`, `mimeType`。

### 2. 多重字段匹配 (Fallback 机制)
由于不同厂商（Sony, Canon, Nikon, Apple）的标签命名不尽相同，我实现了多字段备选逻辑，例如：
-   **镜头型号**：尝试 `LensModel`, `LensType`, `LensInfo`。
-   **图像尺寸**：尝试 `ImageWidth`, `ExifImageWidth`, `SourceImageWidth`。
-   **ISO**：尝试 `ISO`, `BaseISO`。

### 3. 信息最大化存储 (`raw` 字段)
为了确保不遗漏任何有用的信息，新增了 `raw` 字段，用于存储一些虽然常用但未在顶级接口定义的参数，如：
-   场景拍摄类型 (SceneCaptureType)
-   对比度 (Contrast)
-   饱和度 (Saturation)
-   锐度 (Sharpness)
-   数字变焦倍数 (DigitalZoomRatio)
-   图像唯一 ID (ImageUniqueID)

### 4. 数据库兼容性
由于数据库层使用 JSON 字符串存储 `exif_data` 列，本次修改在不改变表结构的情况下，自动提升了存储信息的丰富度。

## 验证建议
-   扫描包含 RAW 格式或高阶单反照片的目录。
-   检查数据库中的 `exif_data` 字段，确认新字段已被正确填充。

---
*此改进将显著提升 Nexus Media 的专业媒体管理能力。*
