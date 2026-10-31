const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('littlemissDesktop', {
  loadAll: () => ipcRenderer.invoke('data:load-all'),
  loadSettings: () => ipcRenderer.invoke('data:load-settings'),
  importBackup: (backup) => ipcRenderer.invoke('data:import', backup),
  create: (table, values) => ipcRenderer.invoke('data:create', table, values),
  bulkCreate: (table, rows) => ipcRenderer.invoke('data:bulk-create', table, rows),
  update: (table, id, patch) => ipcRenderer.invoke('data:update', table, id, patch),
  remove: (table, id) => ipcRenderer.invoke('data:remove', table, id),
  saveFile: (file) => ipcRenderer.invoke('file:save', file),
  readFile: (fileRef) => ipcRenderer.invoke('file:read', fileRef),
  readFilePath: (filePath) => ipcRenderer.invoke('file:read-path', filePath),
});