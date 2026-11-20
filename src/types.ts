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
  /** Accent colour used for glows and the selected outline. */
  accent: string
  favorite: boolean
  /** Bundled sample artwork key, resolved by the renderer. */
  artworkKey: string | null
  /** User artwork served by the app-media protocol. */
  artworkUrl: string | null
  /** Absolute path to the file that starts the game; empty until chosen. */
  launcher: string
  launcherArgs: string
  /** True when the launch target exists on disk right now. */
  installed: boolean
  playtimeMinutes: number
  lastPlayedAt: number | null
}

export interface GamePatch {
  title?: string
  tagline?: string
  genre?: string
  accent?: string
  favorite?: boolean
  launcher?: string
  launcherArgs?: string
}

export interface LibrarySnapshot {
  games: Game[]
  runningIds: string[]
}

export interface ImportResult {
  added: number
  skipped: number
  canceled: boolean
}

export interface LaunchResult {
  ok: boolean
  error?: string
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
  getLibrary(): Promise<LibrarySnapshot>
  importGames(): Promise<ImportResult>
  pickExecutable(): Promise<string | null>
  updateGame(id: string, patch: GamePatch): Promise<LibrarySnapshot>
  removeGame(id: string): Promise<LibrarySnapshot>
  chooseArtwork(id: string): Promise<LibrarySnapshot | null>
  clearArtwork(id: string): Promise<LibrarySnapshot>
  launchGame(id: string): Promise<LaunchResult>
  revealGame(id: string): Promise<void>
  /** Fires whenever the main process changes the library or a game's state. */
  onLibraryChanged(listener: (snapshot: LibrarySnapshot) => void): () => void
}
