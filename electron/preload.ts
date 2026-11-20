import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { Api, LibrarySnapshot } from '../src/types'

/**
 * The renderer only gets this small, typed surface. Adding a capability means
 * adding a named function here plus a matching ipcMain.handle in main.ts.
 */
const api: Api = {
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  getLibrary: () => ipcRenderer.invoke('library:get'),
  importGames: () => ipcRenderer.invoke('library:import'),
  pickExecutable: () => ipcRenderer.invoke('library:pick-executable'),
  updateGame: (id, patch) => ipcRenderer.invoke('library:update', id, patch),
  removeGame: (id) => ipcRenderer.invoke('library:remove', id),
  chooseArtwork: (id) => ipcRenderer.invoke('library:choose-artwork', id),
  clearArtwork: (id) => ipcRenderer.invoke('library:clear-artwork', id),
  launchGame: (id) => ipcRenderer.invoke('library:launch', id),
  revealGame: (id) => ipcRenderer.invoke('library:reveal', id),
  onLibraryChanged: (listener) => {
    const handler = (_event: IpcRendererEvent, snapshot: LibrarySnapshot) => listener(snapshot)
    ipcRenderer.on('library:changed', handler)
    return () => {
      ipcRenderer.removeListener('library:changed', handler)
    }
  },
}

contextBridge.exposeInMainWorld('api', api)
