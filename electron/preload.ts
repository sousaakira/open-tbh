import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  onResetUiScale: (callback: () => void) => {
    ipcRenderer.on('reset-ui-scale', callback)
  },
  onWindowResize: (callback: (size: { width: number; height: number }) => void) => {
    ipcRenderer.on('window-resized', (_event, size) => callback(size))
  },
  windowDragStart: (screenX: number, screenY: number) => {
    ipcRenderer.send('window-drag-start', { screenX, screenY })
  },
  windowDragMove: (screenX: number, screenY: number) => {
    ipcRenderer.send('window-drag-move', { screenX, screenY })
  },
  windowDragEnd: () => {
    ipcRenderer.send('window-drag-end')
  },
  platform: process.platform,
})
