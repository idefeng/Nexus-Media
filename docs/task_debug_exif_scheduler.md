# 任务：排查 EXIF 提取未启动问题并增强调度器日志

## 任务背景
用户反馈后台似乎没有启动 EXIF 获取操作。经初步排查：
1.  数据库中存在 16887 个待处理项，但只有 95 个已处理项。
2.  配置文件 `nexus-media-config.json` 中的 `exif.autoExtract` 为 `false`。
3.  `electron/main.ts` 中的调度器缺乏详细日志，无法直观看到任务跳过的原因。
4.  `processExifBatch` 缺乏运行锁（Processing Lock），在高负载下可能导致并发冲突。

## 改进方案
1.  **增强调度器日志**：在 `main.ts` 的定时器中添加日志，记录每个后台任务的启动状态和跳过原因（如果是由于配置关闭）。
2.  **添加运行锁**：在 `electron/exif.ts` 中为 `processExifBatch` 添加 `isProcessing` 标志，防止任务重叠。
3.  **修复配置默认值建议**：向用户说明为什么任务未运行，并建议开启 `autoExtract`。

## 预期结果
- 日志中将清晰显示：`[Scheduler] EXIF 自动提取已关闭，跳过。` 或 `[Scheduler] 开始 EXIF 后台处理...`。
- 解决潜在的并发运行问题。
