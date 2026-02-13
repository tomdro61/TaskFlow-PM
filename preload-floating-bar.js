const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('floatingBarApi', {
  onTaskUpdate: (callback) => {
    ipcRenderer.removeAllListeners('floating-bar-task');
    ipcRenderer.on('floating-bar-task', (event, task) => callback(task));
  },
  completeTask: (taskId) => ipcRenderer.send('floating-bar-complete', taskId),
  toggleSubtask: (taskId, subtaskId) => ipcRenderer.send('floating-bar-toggle-subtask', taskId, subtaskId),
  close: () => ipcRenderer.send('floating-bar-close'),
  resize: () => ipcRenderer.send('floating-bar-resize'),
  showMain: () => ipcRenderer.send('floating-bar-show-main'),
  copyToClipboard: (text) => ipcRenderer.send('floating-bar-copy', text),
  startResize: () => ipcRenderer.send('floating-bar-start-resize'),
  doResize: (deltaX, deltaY) => ipcRenderer.send('floating-bar-do-resize', deltaX, deltaY)
});
