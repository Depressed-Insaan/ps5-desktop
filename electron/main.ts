import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { registerLibraryIpc, registerMediaScheme } from './library/ipc'
import { finishAllSessions } from './library/launch'
import { getSettings, initStore } from './library/store'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │ │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Must run before the app is ready, so the scheme can serve local artwork.
registerMediaScheme()

// Read-only facts about the app, consumed by the dashboard status card.
ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  platform: process.platform,
}))

let win: BrowserWindow | null = null

function createWindow(fullscreen: boolean) {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1140,
    minHeight: 700,
    show: false,
    backgroundColor: '#05060a',
    autoHideMenuBar: true,
    title: 'Ani Games',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.setMenuBarVisibility(false)
  if (fullscreen) win.setFullScreen(true)

  // Avoid a white flash: the dashboard only appears once it has rendered.
  win.once('ready-to-show', () => win?.show())

  // External links open in the user's browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(getSettings().fullscreen)
  }
})

// Bank the playtime of anything still running before the app goes away.
app.on('before-quit', () => {
  finishAllSessions()
})

app.whenReady().then(() => {
  initStore(app.getPath('userData'))
  registerLibraryIpc()
  createWindow(getSettings().fullscreen)
})
