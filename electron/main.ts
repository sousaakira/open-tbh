import { app, BrowserWindow, ipcMain, screen, globalShortcut } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  TASKBAR_MARGIN,
  WINDOW_HEIGHT,
  WINDOW_MAX_HEIGHT,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_WIDTH,
} from '../shared/gameLayout'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

let dragOffset = { x: 0, y: 0 }
let isDraggingWindow = false

function getTaskbarPosition(): { x: number; y: number } {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  const { x: workX, y: workY } = screen.getPrimaryDisplay().workArea

  return {
    x: workX + Math.round((screenWidth - WINDOW_WIDTH) / 2),
    y: workY + screenHeight - WINDOW_HEIGHT - TASKBAR_MARGIN,
  }
}

function createWindow(): void {
  const { x, y } = getTaskbarPosition()

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x,
    y,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    maxHeight: WINDOW_MAX_HEIGHT,
    frame: false,
    transparent: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const sendWindowSize = () => {
    if (!mainWindow) return
    const [width, height] = mainWindow.getContentSize()
    mainWindow.webContents.send('window-resized', { width, height })
  }

  mainWindow.webContents.on('did-finish-load', sendWindowSize)

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    if (process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('resize', sendWindowSize)
}

function registerWindowDrag(): void {
  ipcMain.on('window-drag-start', (event, { screenX, screenY }: { screenX: number; screenY: number }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    const [winX, winY] = win.getPosition()
    dragOffset = { x: screenX - winX, y: screenY - winY }
    isDraggingWindow = true
  })

  ipcMain.on('window-drag-move', (event, { screenX, screenY }: { screenX: number; screenY: number }) => {
    if (!isDraggingWindow) return

    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    win.setPosition(Math.round(screenX - dragOffset.x), Math.round(screenY - dragOffset.y))
  })

  ipcMain.on('window-drag-end', () => {
    isDraggingWindow = false
  })
}

function registerShortcuts(): void {
  globalShortcut.register('Shift+F12', () => {
    const { x, y } = getTaskbarPosition()
    mainWindow?.setPosition(x, y)
  })

  globalShortcut.register('Shift+F11', () => {
    mainWindow?.webContents.send('reset-ui-scale')
  })

  globalShortcut.register('F12', () => {
    mainWindow?.webContents.toggleDevTools()
  })
}

app.whenReady().then(() => {
  registerWindowDrag()
  createWindow()
  registerShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
