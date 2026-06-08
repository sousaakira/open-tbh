/// <reference types="vite/client" />

interface ElectronAPI {
  onResetUiScale: (callback: () => void) => void
  onWindowResize?: (callback: (size: { width: number; height: number }) => void) => void
  windowDragStart: (screenX: number, screenY: number) => void
  windowDragMove: (screenX: number, screenY: number) => void
  windowDragEnd: () => void
  platform: string
}

interface Window {
  electronAPI?: ElectronAPI
}
