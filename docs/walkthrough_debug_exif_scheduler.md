# 修复报告：排查并修复 EXIF 后台提取未启动问题

## 问题诊断
经核查，后台未启动 EXIF 获取操作的原因如下：
1.  **配置关闭**：在配置文件 `nexus-media-config.json` 中，`exif.autoExtract` 被设置为 `false`。根据 `main.ts` 的逻辑，只有该项为 `true` 时才会触发后台扫描。
2.  **日志缺失**：主进程调度器（Scheduler）在跳过任务时没有输出日志，导致从表面看“无反应”。
3.  **缺乏并发保护**：原有的 `processExifBatch` 没有运行锁，如果上一批次没处理完，下一批次又启动，可能会造成 `exiftool` 实例冲突。

## 修复与改进步骤

### 1. 修正配置
- 已手动将 `nexus-media-config.json` 中的 `exif.autoExtract` 修正为 `true`。

### 2. 增强调度器日志 (`electron/main.ts`)
- 在调度器中添加了 `[Scheduler] Heartbeat tick...` 日志，确保调度器本身在正常工作。
- 添加了显式的跳过日志：如果 `autoExtract` 关闭，会输出 `[Scheduler] EXIF 自动提取已关闭，跳过。`。

### 3. 实现运行锁 (`electron/exif.ts`)
- 为 `processExifBatch` 引入了 `isProcessing` 标志位。
- 确保同一时间内只有一个 EXIF 处理任务在运行，避免重复读取同一批次文件并预防资源冲突。
- 在任务开始、进度中和结束时增加了更详细的控制台输出。

## 验证情况 (数据库)
- **待处理项**：16887 (已确认为正常待扫描状态)
- **已处理项**：95 (之前仅处理了极少部分)
- **配置同步**：已确认 `autoExtract: true`。

## 后续建议
- 您可以在 Electron 的控制台或启动终端中搜索 `[EXIF]` 标签，查看处理进度。
- 考虑到待处项目较多 (1.6w+)，扫描全部完成可能需要一段时间，请留意控制台进度输出。
