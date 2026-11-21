/**
 * Shared contracts between the React renderer and the Electron preload bridge.
 * Keep this file free of runtime code: both sides import types from here.
 */

export type ViewId = 'home' | 'library' | 'trophies' | 'settings'

export type TrophyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Trophy {
  id: string
  gameId: string
  title: string
  description: string
  tier: TrophyTier
  /** Progress needed before the trophy can be unlocked; at least 1. */
  target: number
  progress: number
  unlockedAt: number | null
  createdAt: number
}

export interface NewTrophy {
  gameId: string
  title: string
  description: string
  tier: TrophyTier
  target: number
  progress?: number
}

export interface TrophyPatch {
  title?: string
  description?: string
  tier?: TrophyTier
  target?: number
  progress?: number
  unlockedAt?: number | null
}

export type ThemeId = 'midnight' | 'aurora' | 'ember'

export interface Settings {
  accent: string
  theme: ThemeId
  startView: 'home' | 'library'
  fullscreen: boolean
  notifyTrophies: boolean
  notifySessions: boolean
}

export type SettingsPatch = Partial<Settings>

export interface Profile {
  name: string
  initials: string
  level: number
}

export interface ProfilePatch {
  name?: string
  initials?: string
}

/** Disk space for the drive that holds the user's files. */
export interface StorageInfo {
  available: boolean
  /** Root of the drive, e.g. `C:\`. */
  drive: string
  totalBytes: number
  usedBytes: number
  freeBytes: number
}

/** How Ani Games decides that a play session has ended. */
export type WatchMode = 'process' | 'tree' | 'window' | 'manual'

/**
 * Everything needed to start one game. `runtime` names an adapter in the main
 * process registry; the adapter alone decides which command that turns into.
 */
export interface LaunchConfig {
  runtime: string
  /** The folder the user imported. Entry points must stay inside it. */
  root: string
  /** Absolute path to the file that starts the game. */
  entry: string
  /** Working directory; always editable, always validated on launch. */
  cwd: string
  /** Stored as an array so it is never re-split, or re-interpreted by a shell. */
  args: string[]
  /** Extra environment values, merged over a sanitised environment. */
  env: Record<string, string>
  watch: WatchMode
  /** Null until the user explicitly approved the previewed command. */
  trustedAt: number | null
}

export interface LaunchPatch {
  runtime?: string
  root?: string
  entry?: string
  cwd?: string
  /** Free text; the main process splits it into an argv array exactly once. */
  argsText?: string
  args?: string[]
  watch?: WatchMode
  /** True once the user has approved the command shown in the preview. */
  trust?: boolean
}

/** A launch configuration being previewed before it is saved. */
export interface LaunchDraft {
  runtime?: string
  entry: string
  cwd?: string
  argsText?: string
  watch?: WatchMode
}

export interface LaunchPreview {
  runtime: string
  label: string
  /** The exact command line Ani Games would run. */
  command: string
  cwd: string
  watch: WatchMode
  ready: boolean
  requiresTrust: boolean
  warning: string | null
}

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
  /** Authoritative launch descriptor; the two fields above mirror it. */
  launch: LaunchConfig
  /** Human name of the runtime, e.g. "HTML game" or "Batch script". */
  launchLabel: string
  /** The exact command Ani Games will run, for previews and tooltips. */
  launchCommand: string
  /** False when the runtime or the entry point cannot be used right now. */
  launchReady: boolean
  /** Why the game cannot start, when `launchReady` is false. */
  launchWarning: string | null
  /** True for scripts and shortcuts that need an explicit trust decision. */
  requiresTrust: boolean
  trusted: boolean
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

/** Everything the main process owns, pushed to the renderer on every change. */
export interface AppSnapshot {
  games: Game[]
  runningIds: string[]
  trophies: Trophy[]
  settings: Settings
  profile: Profile
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

/** One file or folder offered by the import sheet. */
export interface ImportCandidate {
  /** Opaque handle; the main process keeps the detection behind it. */
  token: string
  /** The file or folder the user actually picked. */
  source: string
  title: string
  kind: 'file' | 'folder'
  /** Empty when nothing in the target can be started yet. */
  runtime: string
  runtimeLabel: string
  entry: string
  cwd: string
  watch: WatchMode
  command: string
  requiresTrust: boolean
  /** More than one plausible entry point was found; the user must choose. */
  ambiguous: boolean
  alreadyImported: boolean
  importable: boolean
  warning: string | null
  notes: string[]
}

export interface ImportSelection {
  token: string
  trusted: boolean
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
  getState(): Promise<AppSnapshot>
  getStorageInfo(): Promise<StorageInfo>
  importGames(): Promise<ImportResult>
  pickExecutable(): Promise<string | null>
  /** Native picker for one or more files, or folders. */
  pickLaunchTarget(kind: 'file' | 'folder'): Promise<string[]>
  inspectPaths(paths: string[]): Promise<ImportCandidate[]>
  importCandidates(selection: ImportSelection[]): Promise<ImportResult>
  updateLaunch(id: string, patch: LaunchPatch): Promise<AppSnapshot>
  previewLaunch(id: string, draft: LaunchDraft): Promise<LaunchPreview>
  stopGame(id: string): Promise<AppSnapshot>
  updateGame(id: string, patch: GamePatch): Promise<AppSnapshot>
  removeGame(id: string): Promise<AppSnapshot>
  chooseArtwork(id: string): Promise<AppSnapshot | null>
  clearArtwork(id: string): Promise<AppSnapshot>
  launchGame(id: string): Promise<LaunchResult>
  revealGame(id: string): Promise<void>
  updateSettings(patch: SettingsPatch): Promise<AppSnapshot>
  updateProfile(patch: ProfilePatch): Promise<AppSnapshot>
  addTrophy(input: NewTrophy): Promise<AppSnapshot>
  updateTrophy(id: string, patch: TrophyPatch): Promise<AppSnapshot>
  unlockTrophy(id: string): Promise<AppSnapshot>
  removeTrophy(id: string): Promise<AppSnapshot>
  /** Fires whenever the main process changes the library or its settings. */
  onStateChanged(listener: (snapshot: AppSnapshot) => void): () => void
}
