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
    toggleFavorite: (id) => electron.ipcRenderer.invoke("media:toggleFavorite", id),
    updateTags: (id, tags) => electron.ipcRenderer.invoke("media:updateTags", id, tags),
    updateNotes: (id, notes) => electron.ipcRenderer.invoke("media:updateNotes", id, notes),
    getAllTags: () => electron.ipcRenderer.invoke("media:getAllTags"),
    getItem: (id) => electron.ipcRenderer.invoke("media:getItem", id)
  },
  // AI 功能
  ai: {
    getStatus: () => electron.ipcRenderer.invoke("ai:getStatus"),
    analyze: (imagePath) => electron.ipcRenderer.invoke("ai:analyze", imagePath),
    semanticSearch: (query, limit) => electron.ipcRenderer.invoke("ai:semanticSearch", query, limit || 20),
    adoptTag: (id, tag) => electron.ipcRenderer.invoke("ai:adoptTag", id, tag)
  },
  // Shell 操作
  shell: {
    showInExplorer: (filePath) => electron.ipcRenderer.invoke("shell:showInExplorer", filePath),
    copyPath: (filePath) => electron.ipcRenderer.invoke("shell:copyPath", filePath)
  },
  // 批量操作
  batch: {
    delete: (ids) => electron.ipcRenderer.invoke("media:batchDelete", ids),
    addTags: (ids, tags) => electron.ipcRenderer.invoke("media:batchAddTags", ids, tags),
    deleteOne: (id) => electron.ipcRenderer.invoke("media:delete", id)
  }
});
