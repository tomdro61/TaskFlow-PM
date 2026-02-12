const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  exportData: (data) => ipcRenderer.invoke('export-data', data),
  importData: () => ipcRenderer.invoke('import-data'),
  // Focus Pill APIs
  showPill: () => ipcRenderer.invoke('show-pill'),
  hidePill: () => ipcRenderer.invoke('hide-pill'),
  updatePill: (data) => ipcRenderer.invoke('update-pill', data),
  onPillAction: (callback) => {
    ipcRenderer.on('pill-action', (event, action) => callback(action));
  },
  // Quick Capture APIs
  showCapture: () => ipcRenderer.invoke('show-capture'),
  onTaskCaptured: (callback) => {
    ipcRenderer.on('task-captured', (event, task) => callback(task));
  },
  onShortcutRegistered: (callback) => {
    ipcRenderer.on('shortcut-registered', (event, shortcut) => callback(shortcut));
  },
  // File operations
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
  browseFile: () => ipcRenderer.invoke('browse-file'),
  // Clipboard
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  // Keyboard shortcut trigger
  triggerShortcut: () => ipcRenderer.invoke('trigger-shortcut'),
  // Floating Task Bar
  showFloatingBar: () => ipcRenderer.invoke('show-floating-bar'),
  hideFloatingBar: () => ipcRenderer.invoke('hide-floating-bar'),
  updateFloatingBar: (task) => ipcRenderer.invoke('update-floating-bar', task),
  onFloatingBarComplete: (callback) => {
    ipcRenderer.on('floating-bar-complete-task', (event, taskId) => callback(taskId));
  },
  onFloatingBarToggleSubtask: (callback) => {
    ipcRenderer.on('floating-bar-toggle-subtask', (event, taskId, subtaskId) => callback(taskId, subtaskId));
  },
  // Claude Queue
  runClaudeQueue: () => ipcRenderer.invoke('run-claude-queue'),
  // Notion Sync
  notionTestConnection: (apiKey) => ipcRenderer.invoke('notion-test-connection', apiKey),
  notionSetup: (config) => ipcRenderer.invoke('notion-setup', config),
  notionSaveConfig: (config) => ipcRenderer.invoke('notion-save-config', config),
  notionGetConfig: () => ipcRenderer.invoke('notion-get-config'),
  notionSync: () => ipcRenderer.invoke('notion-sync')
});
