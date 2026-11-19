import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '../src/types'

/**
 * The renderer only gets this small, typed surface. Adding a capability means
 * adding a named function here plus a matching ipcMain.handle in main.ts.
 */
const api: Api = {
  getAppInfo: () => ipcRenderer.invoke('app:info'),
}

contextBridge.exposeInMainWorld('api', api)
