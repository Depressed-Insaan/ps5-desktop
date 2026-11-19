/**
 * Shared contracts between the React renderer and the Electron preload bridge.
 * Keep this file free of runtime code: both sides import types from here.
 */

export type ViewId = 'home' | 'library' | 'trophies' | 'settings'

export interface Game {
  id: string
  title: string
  tagline: string
  genre: string
  /** Imported asset URL (Vite rewrites it for dev and production builds). */
  cover: string
  /** Optional wide artwork used as the cinematic backdrop. */
  hero?: string
  /** Accent colour used for glows and the selected outline. */
  accent: string
  lastPlayed: string
  playtime: string
  installed: boolean
  favorite: boolean
}

export interface Profile {
  name: string
  initials: string
  level: number
}

/** Facts about the running desktop app, provided by the main process. */
export interface AppInfo {
  version: string
  electron: string
  chrome: string
  platform: string
}

/** The complete surface the renderer may call. Nothing else is exposed. */
export interface Api {
  getAppInfo(): Promise<AppInfo>
}
