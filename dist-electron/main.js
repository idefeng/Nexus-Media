"use strict";
const electron = require("electron");
const path = require("path");
const url = require("url");
const Database = require("better-sqlite3");
const fs = require("fs");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const crypto = require("crypto");
const child_process = require("child_process");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
let db;
async function initDatabase() {
  const userDataPath = electron.app.getPath("userData");
  const dbPath = path.join(userDataPath, "nexus_media.db");
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  db = new Database(dbPath);
  const schema = `
        CREATE TABLE IF NOT EXISTS media_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            size INTEGER,
            type TEXT CHECK(type IN ('image', 'video')) NOT NULL,
            ext TEXT,
            birth_time DATETIME,
            modified_time DATETIME,
            tags TEXT DEFAULT '[]',
            notes TEXT DEFAULT '',
            thumbnail_path TEXT,
            width INTEGER,
            height INTEGER,
            duration INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_favorite INTEGER DEFAULT 0,
            ai_tags TEXT DEFAULT NULL,
            embedding BLOB DEFAULT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(type);
        CREATE INDEX IF NOT EXISTS idx_media_favorite ON media_items(is_favorite);
        CREATE INDEX IF NOT EXISTS idx_media_created ON media_items(created_at);
    `;
  db.exec(schema);
  try {
    const columns = db.prepare("PRAGMA table_info(media_items)").all();
    const columnNames = columns.map((c) => c.name);
    if (!columnNames.includes("ai_tags")) {
      db.exec("ALTER TABLE media_items ADD COLUMN ai_tags TEXT DEFAULT NULL");
      console.log("数据库迁移：添加 ai_tags 列");
    }
    if (!columnNames.includes("embedding")) {
      db.exec("ALTER TABLE media_items ADD COLUMN embedding BLOB DEFAULT NULL");
      console.log("数据库迁移：添加 embedding 列");
    }
  } catch (err) {
    console.error("数据库迁移失败:", err);
  }
  console.log("Better-SQLite3 数据库已连接:", dbPath);
}
function getAllMediaItems() {
  return db.prepare("SELECT * FROM media_items ORDER BY created_at DESC").all();
}
function insertMediaItems(files) {
  if (files.length === 0) return 0;
  const insert = db.prepare(`
        INSERT OR IGNORE INTO media_items (
            path, name, size, type, ext, birth_time, modified_time
        ) VALUES (
            @path, @name, @size, @type, @ext, @birthTime, @modifiedTime
        )
    `);
  let insertedCount = 0;
  const transaction = db.transaction((items) => {
    for (const item of items) {
      try {
        const result = insert.run({
          ...item,
          birthTime: item.birthTime instanceof Date ? item.birthTime.toISOString() : item.birthTime,
          modifiedTime: item.modifiedTime instanceof Date ? item.modifiedTime.toISOString() : item.modifiedTime
        });
        if (result.changes > 0) insertedCount++;
      } catch (err) {
        console.error("插入数据库失败:", item.path, err);
      }
    }
  });
  transaction(files);
  return insertedCount;
}
function updateThumbnailPath(id, thumbnailPath) {
  db.prepare("UPDATE media_items SET thumbnail_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(thumbnailPath, id);
}
function getPendingThumbnailItems() {
  return db.prepare("SELECT id, path, type FROM media_items WHERE thumbnail_path IS NULL").all();
}
function getMediaStats() {
  const images = db.prepare("SELECT COUNT(*) as count FROM media_items WHERE type = 'image'").get();
  const videos = db.prepare("SELECT COUNT(*) as count FROM media_items WHERE type = 'video'").get();
  return {
    images: images.count,
    videos: videos.count,
    total: images.count + videos.count
  };
}
function getMediaCount() {
  const result = db.prepare("SELECT COUNT(*) as count FROM media_items").get();
  return result.count;
}
function toggleFavorite(id) {
  db.prepare("UPDATE media_items SET is_favorite = 1 - is_favorite, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  return true;
}
function updateTags(id, tags) {
  const tagsJson = JSON.stringify(tags);
  db.prepare("UPDATE media_items SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(tagsJson, id);
}
function updateNotes(id, notes) {
  db.prepare("UPDATE media_items SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(notes, id);
}
function getAllTags() {
  const rows = db.prepare("SELECT tags FROM media_items WHERE tags IS NOT NULL AND tags != '[]'").all();
  const tagSet = /* @__PURE__ */ new Set();
  for (const row of rows) {
    try {
      const tags = JSON.parse(row.tags);
      tags.forEach((tag) => tagSet.add(tag));
    } catch {
    }
  }
  return Array.from(tagSet).sort();
}
function getMediaItem(id) {
  return db.prepare("SELECT * FROM media_items WHERE id = ?").get(id);
}
function updateAiTags(id, aiTags) {
  const tagsJson = JSON.stringify(aiTags);
  db.prepare("UPDATE media_items SET ai_tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(tagsJson, id);
}
function updateEmbedding(id, embedding) {
  const buffer = Buffer.from(new Float32Array(embedding).buffer);
  db.prepare("UPDATE media_items SET embedding = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(buffer, id);
}
function getPendingAiItems(limit = 10) {
  return db.prepare(`
        SELECT * FROM media_items 
        WHERE type = 'image' 
          AND thumbnail_path IS NOT NULL 
          AND embedding IS NULL 
        ORDER BY created_at DESC 
        LIMIT ?
    `).all(limit);
}
function getAllEmbeddings() {
  return db.prepare(`
        SELECT id, path, embedding FROM media_items 
        WHERE embedding IS NOT NULL
    `).all();
}
function deleteMediaItem(id) {
  const result = db.prepare("DELETE FROM media_items WHERE id = ?").run(id);
  return result.changes > 0;
}
function deleteMediaItems(ids) {
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => "?").join(",");
  const result = db.prepare(`DELETE FROM media_items WHERE id IN (${placeholders})`).run(...ids);
  return result.changes;
}
function batchAddTags(ids, tagsToAdd) {
  if (ids.length === 0 || tagsToAdd.length === 0) return 0;
  let updated = 0;
  const selectStmt = db.prepare("SELECT id, tags FROM media_items WHERE id = ?");
  const updateStmt = db.prepare("UPDATE media_items SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
  const transaction = db.transaction(() => {
    for (const id of ids) {
      const row = selectStmt.get(id);
      if (row) {
        const existingTags = JSON.parse(row.tags || "[]");
        const newTags = Array.from(/* @__PURE__ */ new Set([...existingTags, ...tagsToAdd]));
        updateStmt.run(JSON.stringify(newTags), id);
        updated++;
      }
    }
  });
  transaction();
  return updated;
}
function closeDatabase() {
  if (db) db.close();
}
const IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]);
const VIDEO_EXTENSIONS = /* @__PURE__ */ new Set([".mp4", ".mkv", ".mov", ".avi", ".wmv"]);
const ALL_EXTENSIONS = /* @__PURE__ */ new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);
function isMediaFile(filePath) {
  const ext = path__namespace.extname(filePath).toLowerCase();
  return ALL_EXTENSIONS.has(ext);
}
function getMediaType(filePath) {
  const ext = path__namespace.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext) ? "image" : "video";
}
async function getFileInfo(filePath) {
  try {
    const stats = await fs__namespace.promises.stat(filePath);
    if (!stats.isFile()) return null;
    const ext = path__namespace.extname(filePath).toLowerCase();
    return {
      path: filePath,
      name: path__namespace.basename(filePath),
      size: stats.size,
      type: getMediaType(filePath),
      ext: ext.substring(1),
      // 移除前面的点
      birthTime: stats.birthtime,
      modifiedTime: stats.mtime
    };
  } catch (error) {
    console.error(`读取文件信息失败: ${filePath}`, error);
    return null;
  }
}
async function scanFolder(folderPath, onProgress, batchSize = 50) {
  const allFiles = [];
  const batch = [];
  async function scanDirectory(dirPath) {
    try {
      const entries = await fs__namespace.promises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path__namespace.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && isMediaFile(fullPath)) {
          const fileInfo = await getFileInfo(fullPath);
          if (fileInfo) {
            allFiles.push(fileInfo);
            batch.push(fileInfo);
            if (batch.length >= batchSize) {
              onProgress({
                currentPath: dirPath,
                filesFound: allFiles.length,
                newFiles: [...batch]
              });
              batch.length = 0;
            }
          }
        }
      }
    } catch (error) {
      console.error(`扫描目录失败: ${dirPath}`, error);
    }
  }
  await scanDirectory(folderPath);
  if (batch.length > 0) {
    onProgress({
      currentPath: folderPath,
      filesFound: allFiles.length,
      newFiles: [...batch]
    });
  }
  return allFiles;
}
async function scanFolders(folderPaths, onProgress, batchSize = 50) {
  const allFiles = [];
  for (const folderPath of folderPaths) {
    const files = await scanFolder(folderPath, onProgress, batchSize);
    allFiles.push(...files);
  }
  return allFiles;
}
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
let thumbnailsDir = "";
function initThumbnailsDir() {
  thumbnailsDir = path.join(electron.app.getPath("userData"), "thumbnails");
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }
}
function getHash(filePath) {
  return crypto.createHash("md5").update(filePath).digest("hex");
}
async function generateImageThumbnail(filePath, outputDir) {
  const hash = getHash(filePath);
  const outputPath = path.join(outputDir, `${hash}.webp`);
  if (fs.existsSync(outputPath)) return outputPath;
  await sharp(filePath).resize(300, 300, { fit: "cover" }).webp({ quality: 80 }).toFile(outputPath);
  return outputPath;
}
async function generateVideoThumbnail(filePath, outputDir) {
  const hash = getHash(filePath);
  const outputPath = path.join(outputDir, `${hash}.webp`);
  const tempJpg = path.join(outputDir, `${hash}.jpg`);
  if (fs.existsSync(outputPath)) return outputPath;
  return new Promise((resolve, reject) => {
    ffmpeg(filePath).screenshots({
      timestamps: [1],
      // 第 1 秒
      folder: outputDir,
      filename: `${hash}.jpg`,
      size: "300x?"
    }).on("end", async () => {
      try {
        await sharp(tempJpg).resize(300, 300, { fit: "cover" }).webp({ quality: 80 }).toFile(outputPath);
        setTimeout(() => {
          try {
            if (fs.existsSync(tempJpg)) {
              fs.unlinkSync(tempJpg);
            }
          } catch {
          }
        }, 500);
        resolve(outputPath);
      } catch (err) {
        reject(err);
      }
    }).on("error", (err) => {
      reject(err);
    });
  });
}
let isProcessing = false;
const CONCURRENCY_LIMIT = 4;
async function startThumbnailBatch() {
  if (isProcessing) return;
  isProcessing = true;
  console.log("开始后台缩略图生成提取任务...");
  try {
    const pendingItems = getPendingThumbnailItems();
    console.log(`发现 ${pendingItems.length} 个待处理项`);
    for (let i = 0; i < pendingItems.length; i += CONCURRENCY_LIMIT) {
      const batch = pendingItems.slice(i, i + CONCURRENCY_LIMIT);
      await Promise.all(batch.map(async (item) => {
        try {
          let thumbPath = "";
          if (item.type === "image") {
            thumbPath = await generateImageThumbnail(item.path, thumbnailsDir);
          } else if (item.type === "video") {
            thumbPath = await generateVideoThumbnail(item.path, thumbnailsDir);
          }
          if (thumbPath) {
            updateThumbnailPath(item.id, thumbPath);
          }
        } catch (err) {
          console.error(`生成缩略图失败 [${item.id}]: ${item.path}`, err);
        }
      }));
    }
  } catch (err) {
    console.error("缩略图批处理过程出错:", err);
  } finally {
    isProcessing = false;
    console.log("背景缩略图处理任务空闲/结束");
  }
}
const AI_SERVER_PORT = 8765;
const AI_SERVER_URL = `http://127.0.0.1:${AI_SERVER_PORT}`;
let pythonProcess = null;
let isServerReady = false;
function getPythonPath() {
  const isDev2 = !electron.app.isPackaged;
  const basePath = isDev2 ? path.join(process.cwd(), "ai_engine") : path.join(process.resourcesPath, "ai_engine");
  return path.join(basePath, ".venv", "Scripts", "python.exe");
}
function getScriptPath() {
  const isDev2 = !electron.app.isPackaged;
  return isDev2 ? path.join(process.cwd(), "ai_engine", "main.py") : path.join(process.resourcesPath, "ai_engine", "main.py");
}
async function startAiServer() {
  if (pythonProcess) {
    console.log("AI 服务已在运行");
    return true;
  }
  const pythonPath = getPythonPath();
  const scriptPath = getScriptPath();
  console.log(`启动 AI 服务: ${pythonPath} ${scriptPath}`);
  return new Promise((resolve) => {
    var _a, _b;
    try {
      pythonProcess = child_process.spawn(pythonPath, [scriptPath], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
      (_a = pythonProcess.stdout) == null ? void 0 : _a.on("data", (data) => {
        const output = data.toString();
        console.log("[AI Server]", output);
        if (output.includes("Uvicorn running") || output.includes("Application startup complete")) {
          isServerReady = true;
          resolve(true);
        }
      });
      (_b = pythonProcess.stderr) == null ? void 0 : _b.on("data", (data) => {
        console.error("[AI Server Error]", data.toString());
      });
      pythonProcess.on("close", (code) => {
        console.log(`AI 服务已退出，退出码: ${code}`);
        pythonProcess = null;
        isServerReady = false;
      });
      pythonProcess.on("error", (err) => {
        console.error("AI 服务启动失败:", err);
        pythonProcess = null;
        resolve(false);
      });
      setTimeout(() => {
        if (!isServerReady) {
          console.log("AI 服务启动超时，尝试健康检查...");
          checkHealth().then(resolve);
        }
      }, 3e4);
    } catch (err) {
      console.error("启动 AI 服务失败:", err);
      resolve(false);
    }
  });
}
function stopAiServer() {
  if (pythonProcess) {
    console.log("正在停止 AI 服务...");
    pythonProcess.kill();
    pythonProcess = null;
    isServerReady = false;
  }
}
async function checkHealth() {
  try {
    const response = await fetch(`${AI_SERVER_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5e3)
    });
    const data = await response.json();
    isServerReady = data.status === "ok";
    return isServerReady;
  } catch (err) {
    console.error("AI 服务健康检查失败:", err);
    return false;
  }
}
async function analyzeImage(imagePath) {
  if (!isServerReady) {
    return { success: false, error: "AI 服务未就绪" };
  }
  try {
    const response = await fetch(`${AI_SERVER_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_path: imagePath, top_k: 5, threshold: 0.2 }),
      signal: AbortSignal.timeout(3e4)
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }
    const data = await response.json();
    return {
      success: true,
      tags: data.tags,
      embedding: data.embedding
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
async function embedText(text) {
  if (!isServerReady) {
    return { success: false, error: "AI 服务未就绪" };
  }
  try {
    const response = await fetch(`${AI_SERVER_URL}/embed-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(1e4)
    });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }
    const data = await response.json();
    return { success: true, embedding: data.embedding };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
async function semanticSearch(queryText, limit = 20) {
  const embedResult = await embedText(queryText);
  if (!embedResult.success || !embedResult.embedding) {
    return { success: false, error: embedResult.error };
  }
  const items = getAllEmbeddings();
  if (items.length === 0) {
    return { success: true, results: [] };
  }
  const results = items.map((item) => {
    const embedding = Array.from(new Float32Array(item.embedding.buffer, item.embedding.byteOffset, item.embedding.length / 4));
    const similarity = cosineSimilarity(embedResult.embedding, embedding);
    return {
      id: item.id,
      path: item.path,
      similarity: Math.round(similarity * 100) / 100
      // 保留两位小数
    };
  });
  results.sort((a, b) => b.similarity - a.similarity);
  return {
    success: true,
    results: results.slice(0, limit)
  };
}
async function processBackgroundAnalysis() {
  if (!isServerReady) {
    console.log("AI 服务未就绪，跳过后台分析");
    return;
  }
  const pendingItems = getPendingAiItems(5);
  if (pendingItems.length === 0) {
    return;
  }
  console.log(`后台 AI 分析: 处理 ${pendingItems.length} 张图片`);
  for (const item of pendingItems) {
    try {
      const result = await analyzeImage(item.path);
      if (result.success && result.tags && result.embedding) {
        const tagNames = result.tags.map((t) => t.name);
        updateAiTags(item.id, tagNames);
        updateEmbedding(item.id, result.embedding);
        console.log(`AI 分析完成: ${item.name} -> ${tagNames.join(", ")}`);
      }
    } catch (err) {
      console.error(`AI 分析失败: ${item.path}`, err);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
function getAiStatus() {
  return {
    running: pythonProcess !== null,
    ready: isServerReady
  };
}
electron.protocol.registerSchemesAsPrivileged([
  { scheme: "nexus-media", privileges: { bypassCSP: true, standard: true, secure: true, supportFetchAPI: true, stream: true } }
]);
const isDev = !electron.app.isPackaged;
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 700,
    backgroundColor: "#0a0a0f",
    titleBarStyle: "hiddenInset",
    frame: false,
    // 无边框窗口
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true
      // 保持开启以增强安全性
    }
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
electron.app.whenReady().then(async () => {
  electron.protocol.handle("nexus-media", (request) => {
    try {
      const url$1 = new URL(request.url);
      let filePath = decodeURIComponent(url$1.pathname);
      if (filePath.startsWith("/") && filePath.length > 2 && filePath[1].match(/[a-zA-Z]/) && filePath[2] === ":") {
        filePath = filePath.substring(1);
      } else if (filePath.startsWith("/") && !filePath.includes(":")) {
      }
      const fileUrl = url.pathToFileURL(filePath).toString();
      return electron.net.fetch(fileUrl);
    } catch (error) {
      console.error("协议处理失败:", error);
      return new Response("Invalid path", { status: 400 });
    }
  });
  try {
    await initDatabase();
    console.log("数据库初始化成功");
  } catch (error) {
    console.error("数据库初始化失败:", error);
  }
  initThumbnailsDir();
  startAiServer().then((ready) => {
    if (ready) {
      console.log("AI 服务已启动");
      setInterval(() => {
        processBackgroundAnalysis().catch((err) => console.error("后台 AI 分析错误:", err));
      }, 3e4);
    } else {
      console.log("AI 服务启动失败，将以无 AI 模式运行");
    }
  });
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  stopAiServer();
  closeDatabase();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.ipcMain.handle("window:minimize", () => {
  mainWindow == null ? void 0 : mainWindow.minimize();
});
electron.ipcMain.handle("window:maximize", () => {
  if (mainWindow == null ? void 0 : mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow == null ? void 0 : mainWindow.maximize();
  }
});
electron.ipcMain.handle("window:close", () => {
  mainWindow == null ? void 0 : mainWindow.close();
});
electron.ipcMain.handle("dialog:selectFolder", async () => {
  const result = await electron.dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "multiSelections"],
    title: "选择要扫描的文件夹"
  });
  return result.filePaths;
});
electron.ipcMain.handle("scan:folders", async (_event, folderPaths) => {
  if (!folderPaths || folderPaths.length === 0) {
    return { success: false, message: "未选择文件夹" };
  }
  console.log("开始扫描文件夹:", folderPaths);
  try {
    const onProgress = (progress) => {
      const insertedCount = insertMediaItems(progress.newFiles);
      mainWindow == null ? void 0 : mainWindow.webContents.send("scan:progress", {
        currentPath: progress.currentPath,
        filesFound: progress.filesFound,
        filesInserted: insertedCount,
        newFiles: progress.newFiles.map((f) => ({
          path: f.path,
          name: f.name,
          type: f.type,
          ext: f.ext,
          size: f.size
        }))
      });
    };
    const allFiles = await scanFolders(folderPaths, onProgress, 30);
    startThumbnailBatch();
    const stats = getMediaStats();
    mainWindow == null ? void 0 : mainWindow.webContents.send("scan:complete", {
      totalScanned: allFiles.length,
      stats
    });
    return {
      success: true,
      totalScanned: allFiles.length,
      stats
    };
  } catch (error) {
    console.error("扫描失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "扫描失败"
    };
  }
});
electron.ipcMain.handle("media:getAll", () => {
  try {
    const items = getAllMediaItems();
    return { success: true, items };
  } catch (error) {
    console.error("获取媒体项失败:", error);
    return { success: false, items: [], message: error instanceof Error ? error.message : "获取失败" };
  }
});
electron.ipcMain.handle("media:getStats", () => {
  try {
    const stats = getMediaStats();
    const count = getMediaCount();
    return { success: true, stats, count };
  } catch (error) {
    console.error("获取统计失败:", error);
    return { success: false, stats: { images: 0, videos: 0, total: 0 }, count: 0 };
  }
});
electron.ipcMain.handle("media:toggleFavorite", (_event, id) => {
  try {
    const success = toggleFavorite(id);
    return { success };
  } catch (error) {
    console.error("切换收藏状态失败:", error);
    return { success: false };
  }
});
electron.ipcMain.handle("media:updateTags", (_event, id, tags) => {
  try {
    updateTags(id, tags);
    return { success: true };
  } catch (error) {
    console.error("更新标签失败:", error);
    return { success: false };
  }
});
electron.ipcMain.handle("media:updateNotes", (_event, id, notes) => {
  try {
    updateNotes(id, notes);
    return { success: true };
  } catch (error) {
    console.error("更新备注失败:", error);
    return { success: false };
  }
});
electron.ipcMain.handle("media:getAllTags", () => {
  try {
    const tags = getAllTags();
    return { success: true, tags };
  } catch (error) {
    console.error("获取标签失败:", error);
    return { success: false, tags: [] };
  }
});
electron.ipcMain.handle("media:getItem", (_event, id) => {
  try {
    const item = getMediaItem(id);
    return { success: true, item };
  } catch (error) {
    console.error("获取媒体项失败:", error);
    return { success: false, item: null };
  }
});
electron.ipcMain.handle("ai:getStatus", () => {
  return getAiStatus();
});
electron.ipcMain.handle("ai:analyze", async (_event, imagePath) => {
  try {
    const result = await analyzeImage(imagePath);
    return result;
  } catch (error) {
    console.error("AI 分析失败:", error);
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("ai:semanticSearch", async (_event, query, limit = 20) => {
  try {
    const result = await semanticSearch(query, limit);
    return result;
  } catch (error) {
    console.error("语义搜索失败:", error);
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("ai:adoptTag", (_event, id, tag) => {
  try {
    const item = getMediaItem(id);
    if (!item) return { success: false, error: "媒体项不存在" };
    const currentTags = JSON.parse(item.tags || "[]");
    if (!currentTags.includes(tag)) {
      currentTags.push(tag);
      updateTags(id, currentTags);
    }
    return { success: true, tags: currentTags };
  } catch (error) {
    console.error("采纳标签失败:", error);
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("shell:showInExplorer", (_event, filePath) => {
  try {
    electron.shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    console.error("打开资源管理器失败:", error);
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("shell:copyPath", (_event, filePath) => {
  try {
    electron.clipboard.writeText(filePath);
    return { success: true };
  } catch (error) {
    console.error("复制路径失败:", error);
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("media:delete", async (_event, id) => {
  try {
    const item = getMediaItem(id);
    if (!item) return { success: false, error: "媒体项不存在" };
    await electron.shell.trashItem(item.path);
    deleteMediaItem(id);
    return { success: true };
  } catch (error) {
    console.error("删除媒体项失败:", error);
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("media:batchDelete", async (_event, ids) => {
  try {
    let deletedCount = 0;
    for (const id of ids) {
      const item = getMediaItem(id);
      if (item) {
        try {
          await electron.shell.trashItem(item.path);
          deletedCount++;
        } catch (e) {
          console.error(`移动文件到回收站失败: ${item.path}`, e);
        }
      }
    }
    const dbDeleted = deleteMediaItems(ids);
    return { success: true, deleted: deletedCount, dbDeleted };
  } catch (error) {
    console.error("批量删除失败:", error);
    return { success: false, error: String(error) };
  }
});
electron.ipcMain.handle("media:batchAddTags", (_event, ids, tags) => {
  try {
    const updated = batchAddTags(ids, tags);
    return { success: true, updated };
  } catch (error) {
    console.error("批量添加标签失败:", error);
    return { success: false, error: String(error) };
  }
});
