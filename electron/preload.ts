import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { Api, AppSnapshot } from '../src/types'

/**
 * The renderer only gets this small, typed surface. Adding a capability means
 * adding a named function here plus a matching ipcMain.handle in main.ts.
 */
const api: Api = {
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  getState: () => ipcRenderer.invoke('state:get'),
  getStorageInfo: () => ipcRenderer.invoke('storage:info'),
  importGames: () => ipcRenderer.invoke('library:import'),
  pickExecutable: () => ipcRenderer.invoke('library:pick-executable'),
  pickLaunchTarget: (kind) => ipcRenderer.invoke('library:pick-target', kind),
  inspectPaths: (paths) => ipcRenderer.invoke('library:inspect', paths),
  importCandidates: (selection) => ipcRenderer.invoke('library:import-candidates', selection),
  updateLaunch: (id, patch) => ipcRenderer.invoke('library:update-launch', id, patch),
  previewLaunch: (id, draft) => ipcRenderer.invoke('launch:preview', id, draft),
  stopGame: (id) => ipcRenderer.invoke('library:stop', id),
  updateGame: (id, patch) => ipcRenderer.invoke('library:update', id, patch),
  removeGame: (id) => ipcRenderer.invoke('library:remove', id),
  chooseArtwork: (id) => ipcRenderer.invoke('library:choose-artwork', id),
  clearArtwork: (id) => ipcRenderer.invoke('library:clear-artwork', id),
  launchGame: (id) => ipcRenderer.invoke('library:launch', id),
  revealGame: (id) => ipcRenderer.invoke('library:reveal', id),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  updateProfile: (patch) => ipcRenderer.invoke('profile:update', patch),
  addTrophy: (input) => ipcRenderer.invoke('trophies:add', input),
  updateTrophy: (id, patch) => ipcRenderer.invoke('trophies:update', id, patch),
  unlockTrophy: (id) => ipcRenderer.invoke('trophies:unlock', id),
  removeTrophy: (id) => ipcRenderer.invoke('trophies:remove', id),
  onStateChanged: (listener) => {
    const handler = (_event: IpcRendererEvent, snapshot: AppSnapshot) => listener(snapshot)
    ipcRenderer.on('state:changed', handler)
    return () => {
      ipcRenderer.removeListener('state:changed', handler)
    }
  },
}

contextBridge.exposeInMainWorld('api', api)
