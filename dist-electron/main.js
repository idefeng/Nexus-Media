"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
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
let mediaItems = [];
let nextId = 1;
let dataFilePath = "";
function getDataFilePath() {
  if (dataFilePath) return dataFilePath;
  const userDataPath = electron.app.getPath("userData");
  dataFilePath = path.join(userDataPath, "nexus_media_data.json");
  return dataFilePath;
}
function loadFromFile() {
  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      mediaItems = parsed.items || [];
      nextId = parsed.nextId || 1;
      console.log(`从文件加载了 ${mediaItems.length} 个媒体项`);
    }
  } catch (error) {
    console.error("加载数据失败:", error);
    mediaItems = [];
    nextId = 1;
  }
}
function saveToFile() {
  try {
    const filePath = getDataFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify({ items: mediaItems, nextId }, null, 2));
  } catch (error) {
    console.error("保存数据失败:", error);
  }
}
async function initDatabase() {
  loadFromFile();
  console.log("数据库初始化完成 (内存模式)");
}
function closeDatabase() {
  saveToFile();
  console.log("数据已保存");
}
function insertMediaItems(files) {
  if (files.length === 0) return 0;
  const existingPaths = new Set(mediaItems.map((item) => item.path));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let insertedCount = 0;
  for (const file of files) {
    if (existingPaths.has(file.path)) continue;
    const record = {
      id: nextId++,
      path: file.path,
      name: file.name,
      size: file.size,
      type: file.type,
      ext: file.ext,
      birth_time: file.birthTime.toISOString(),
      modified_time: file.modifiedTime.toISOString(),
      tags: "[]",
      notes: "",
      thumbnail_path: null,
      is_favorite: 0,
      created_at: now,
      updated_at: now
    };
    mediaItems.push(record);
    existingPaths.add(file.path);
    insertedCount++;
  }
  if (insertedCount > 0) {
    setImmediate(() => saveToFile());
  }
  return insertedCount;
}
function getAllMediaItems() {
  return [...mediaItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
function getMediaCount() {
  return mediaItems.length;
}
function getMediaStats() {
  const images = mediaItems.filter((item) => item.type === "image").length;
  const videos = mediaItems.filter((item) => item.type === "video").length;
  return { images, videos, total: images + videos };
}
function toggleFavorite(id) {
  const item = mediaItems.find((item2) => item2.id === id);
  if (!item) return false;
  item.is_favorite = item.is_favorite === 0 ? 1 : 0;
  item.updated_at = (/* @__PURE__ */ new Date()).toISOString();
  setImmediate(() => saveToFile());
  return true;
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
  try {
    await initDatabase();
    console.log("数据库初始化成功");
  } catch (error) {
    console.error("数据库初始化失败:", error);
  }
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
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
