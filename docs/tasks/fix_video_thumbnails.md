# 修复视频缩略图显示问题

## 问题描述
用户反馈视频文件无法显示缩略图。

## 原因分析
通过排查发现，`ffmpeg-static` 依赖在 `pnpm` 环境下安装时，二进制文件 `ffmpeg.exe` 可能被放置在 `node_modules/.ignored` 等非标准路径下，导致 `fluent-ffmpeg` 无法找到 FFmpeg 可执行文件。

## 解决方案
在 `electron/thumbnails.ts` 中增强了 `getFFmpegPath` 函数的路径查找逻辑。

1.  **多路径探测**：现在会按顺序检查以下路径：
    - `ffmpeg-static` 模块本身提供的路径（包括处理 `app.asar` 打包情况）。
    - 开发环境特有的 `node_modules/.ignored/ffmpeg-static/ffmpeg.exe` 路径。
    - 标准的 `node_modules/ffmpeg-static/ffmpeg.exe` 路径。
    - 打包后的资源目录 `resources/ffmpeg.exe` 和 `resources/bin/ffmpeg.exe`。
2.  **日志记录**：添加了详细的控制台日志，输出最终找到的 FFmpeg 路径或错误信息，便于后续排查。
3.  **环境变量回退**：如果所有文件路径都未找到，最后尝试使用系统环境变量中的 `ffmpeg` 命令。

## 验证
用户确认修复后，视频文件的缩略图已能正常显示。
