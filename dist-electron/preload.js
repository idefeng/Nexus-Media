"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // 窗口控制
  window: {
    minimize: () => electron.ipcRenderer.invoke("window:minimize"),
    maximize: () => electron.ipcRenderer.invoke("window:maximize"),
    close: () => electron.ipcRenderer.invoke("window:close")
  },
  // 对话框
  dialog: {
    selectFolder: () => electron.ipcRenderer.invoke("dialog:selectFolder")
  },
  // 文件扫描
  scan: {
    folders: (folderPaths) => electron.ipcRenderer.invoke("scan:folders", folderPaths),
    onProgress: (callback) => {
      const handler = (_event, progress) => callback(progress);
      electron.ipcRenderer.on("scan:progress", handler);
      return () => electron.ipcRenderer.removeListener("scan:progress", handler);
    },
    onComplete: (callback) => {
      const handler = (_event, info) => callback(info);
      electron.ipcRenderer.on("scan:complete", handler);
      return () => electron.ipcRenderer.removeListener("scan:complete", handler);
    }
  },
  // 媒体操作
  media: {
    getAll: () => electron.ipcRenderer.invoke("media:getAll"),
    getStats: () => electron.ipcRenderer.invoke("media:getStats"),
    toggleFavorite: (id) => electron.ipcRenderer.invoke("media:toggleFavorite", id)
  }
});
