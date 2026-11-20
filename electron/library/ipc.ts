import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron'
import type { OpenDialogOptions } from 'electron'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { statfs, unlink } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type {
  AppSnapshot,
  Game,
  GamePatch,
  NewTrophy,
  ProfilePatch,
  Settings,
  SettingsPatch,
  StorageInfo,
  TrophyPatch,
  TrophyTier,
} from '../../src/types'
import { launchGame, runningGameIds, setSessionEndHandler } from './launch'
import {
  addGames,
  addPlaytime,
  addTrophy,
  getGame,
  getProfile,
  getSettings,
  getTrophy,
  listGames,
  listTrophies,
  mediaDirectory,
  removeGame,
  removeTrophy,
  setArtwork,
  updateGame,
  updateProfile,
  updateSettings,
  updateTrophy,
} from './store'
import type { NewGame, StoredGame } from './store'

/** Custom scheme used for artwork the user supplies from disk. */
export const MEDIA_SCHEME = 'app-media'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif']
const GAME_EXTENSIONS = ['exe', 'bat', 'cmd', 'lnk']
const ACCENTS = ['#5aa9ff', '#ff8a5c', '#ff5aa8', '#ffa94d', '#7fe0a0', '#ffd166', '#4fd8ff', '#9b8cff']
const TIERS: TrophyTier[] = ['bronze', 'silver', 'gold', 'platinum']
const THEMES = ['midnight', 'aurora', 'ember']

export function registerMediaScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
    },
  ])
}

function toGame(game: StoredGame): Game {
  return {
    id: game.id,
    title: game.title,
    tagline: game.tagline,
    genre: game.genre,
    accent: game.accent,
    favorite: game.favorite,
    artworkKey: game.artworkKey,
    artworkUrl: game.artworkFile
      ? `${MEDIA_SCHEME}://media/${encodeURIComponent(game.artworkFile)}`
      : null,
    launcher: game.launcher,
    launcherArgs: game.launcherArgs,
    installed: game.launcher !== '' && existsSync(game.launcher),
    playtimeMinutes: Math.round(game.playtimeSeconds / 60),
    lastPlayedAt: game.lastPlayedAt,
  }
}

function snapshot(): AppSnapshot {
  return {
    games: listGames().map(toGame),
    runningIds: runningGameIds(),
    trophies: listTrophies(),
    settings: getSettings(),
    profile: getProfile(),
  }
}

function broadcast() {
  const next = snapshot()
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('state:changed', next)
  }
}

function dialogParent(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
}

function showOpenDialog(options: OpenDialogOptions) {
  const parent = dialogParent()
  return parent ? dialog.showOpenDialog(parent, options) : dialog.showOpenDialog(options)
}

function titleFromPath(file: string): string {
  const name = path.basename(file, path.extname(file))
  const cleaned = name.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned || path.basename(file)
}

function accentFor(value: string): string {
  let hash = 0
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) % 1009
  return ACCENTS[hash % ACCENTS.length]
}

function entriesFor(files: string[]): { entries: NewGame[]; skipped: number } {
  const known = new Set(listGames().map((game) => game.launcher.toLowerCase()))
  const entries: NewGame[] = []

  for (const file of files) {
    const key = file.toLowerCase()
    if (known.has(key)) continue
    known.add(key)
    entries.push({
      title: titleFromPath(file),
      tagline: '',
      genre: '',
      accent: accentFor(file),
      favorite: false,
      launcher: file,
      launcherArgs: '',
      artworkKey: null,
      artworkFile: null,
      playtimeSeconds: 0,
      lastPlayedAt: null,
    })
  }

  return { entries, skipped: files.length - entries.length }
}

async function removeMediaFile(fileName: string) {
  try {
    await unlink(path.join(mediaDirectory(), path.basename(fileName)))
  } catch {
    // Already gone; nothing to clean up.
  }
}

function applyFullscreen(fullscreen: boolean) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.setFullScreen(fullscreen)
  }
}

function readTrophyInput(raw: unknown): NewTrophy | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as Record<string, unknown>

  if (typeof input.gameId !== 'string' || !getGame(input.gameId)) return null
  if (typeof input.title !== 'string' || !input.title.trim()) return null
  if (typeof input.description !== 'string') return null
  if (!TIERS.includes(input.tier as TrophyTier)) return null

  return {
    gameId: input.gameId,
    title: input.title.slice(0, 120),
    description: input.description.slice(0, 400),
    tier: input.tier as TrophyTier,
    target: typeof input.target === 'number' ? input.target : 1,
    progress: typeof input.progress === 'number' ? input.progress : 0,
  }
}

function readTrophyPatch(raw: unknown): TrophyPatch {
  if (!raw || typeof raw !== 'object') return {}
  const input = raw as Record<string, unknown>
  const patch: TrophyPatch = {}

  if (typeof input.title === 'string') patch.title = input.title.slice(0, 120)
  if (typeof input.description === 'string') patch.description = input.description.slice(0, 400)
  if (TIERS.includes(input.tier as TrophyTier)) patch.tier = input.tier as TrophyTier
  if (typeof input.target === 'number') patch.target = input.target
  if (typeof input.progress === 'number') patch.progress = input.progress

  return patch
}

function readSettingsPatch(raw: unknown): SettingsPatch {
  if (!raw || typeof raw !== 'object') return {}
  const input = raw as Record<string, unknown>
  const patch: SettingsPatch = {}

  if (typeof input.accent === 'string' && /^#[0-9a-f]{6}$/i.test(input.accent)) {
    patch.accent = input.accent
  }
  if (typeof input.theme === 'string' && THEMES.includes(input.theme)) {
    patch.theme = input.theme as Settings['theme']
  }
  if (input.startView === 'home' || input.startView === 'library') {
    patch.startView = input.startView
  }
  if (typeof input.fullscreen === 'boolean') patch.fullscreen = input.fullscreen
  if (typeof input.notifyTrophies === 'boolean') patch.notifyTrophies = input.notifyTrophies
  if (typeof input.notifySessions === 'boolean') patch.notifySessions = input.notifySessions

  return patch
}

function readProfilePatch(raw: unknown): ProfilePatch {
  if (!raw || typeof raw !== 'object') return {}
  const input = raw as Record<string, unknown>
  const patch: ProfilePatch = {}

  if (typeof input.name === 'string') patch.name = input.name.slice(0, 60)
  if (typeof input.initials === 'string') patch.initials = input.initials.slice(0, 2)

  return patch
}

async function readStorage(): Promise<StorageInfo> {
  const drive = process.platform === 'win32' ? path.parse(app.getPath('home')).root : '/'

  try {
    const stats = await statfs(drive)
    const totalBytes = stats.blocks * stats.bsize
    const freeBytes = stats.bavail * stats.bsize

    if (!totalBytes) throw new Error('The drive reported no capacity.')

    return {
      available: true,
      drive,
      totalBytes,
      usedBytes: Math.max(0, totalBytes - freeBytes),
      freeBytes: Math.max(0, freeBytes),
    }
  } catch (error) {
    console.warn('[library] Disk space could not be read.', error)
    return { available: false, drive, totalBytes: 0, usedBytes: 0, freeBytes: 0 }
  }
}

export function registerLibraryIpc() {
  setSessionEndHandler((gameId, seconds, endedAt) => {
    addPlaytime(gameId, seconds, endedAt)
    broadcast()
  })

  protocol.handle(MEDIA_SCHEME, (request) => {
    const name = path.basename(decodeURIComponent(new URL(request.url).pathname))
    const file = path.join(mediaDirectory(), name)
    if (!name || !existsSync(file)) return new Response('Not found', { status: 404 })
    return net.fetch(pathToFileURL(file).toString())
  })

  ipcMain.handle('state:get', () => snapshot())

  ipcMain.handle('storage:info', () => readStorage())

  ipcMain.handle('library:import', async () => {
    const result = await showOpenDialog({
      title: 'Import games',
      buttonLabel: 'Import',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Games', extensions: GAME_EXTENSIONS },
        { name: 'All files', extensions: ['*'] },
      ],
    })

    if (result.canceled) return { added: 0, skipped: 0, canceled: true }

    const { entries, skipped } = entriesFor(result.filePaths)
    addGames(entries)
    if (entries.length > 0) broadcast()
    return { added: entries.length, skipped, canceled: false }
  })

  ipcMain.handle('library:pick-executable', async () => {
    const result = await showOpenDialog({
      title: 'Choose a launch target',
      buttonLabel: 'Choose',
      properties: ['openFile'],
      filters: [
        { name: 'Programs', extensions: GAME_EXTENSIONS },
        { name: 'All files', extensions: ['*'] },
      ],
    })

    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  ipcMain.handle('library:update', (_event, id: unknown, patch: unknown) => {
    if (typeof id !== 'string' || !patch || typeof patch !== 'object') return snapshot()

    const input = patch as Partial<Record<keyof GamePatch, unknown>>
    updateGame(id, {
      title: typeof input.title === 'string' ? input.title.slice(0, 120) : undefined,
      tagline: typeof input.tagline === 'string' ? input.tagline.slice(0, 400) : undefined,
      genre: typeof input.genre === 'string' ? input.genre.slice(0, 60) : undefined,
      accent:
        typeof input.accent === 'string' && /^#[0-9a-f]{6}$/i.test(input.accent)
          ? input.accent
          : undefined,
      favorite: typeof input.favorite === 'boolean' ? input.favorite : undefined,
      launcher: typeof input.launcher === 'string' ? input.launcher : undefined,
      launcherArgs: typeof input.launcherArgs === 'string' ? input.launcherArgs.slice(0, 500) : undefined,
    })
    broadcast()
    return snapshot()
  })

  ipcMain.handle('library:remove', async (_event, id: unknown) => {
    if (typeof id === 'string') {
      const removed = removeGame(id)
      if (removed?.artworkFile) await removeMediaFile(removed.artworkFile)
      if (removed) broadcast()
    }
    return snapshot()
  })

  ipcMain.handle('library:choose-artwork', async (_event, id: unknown) => {
    if (typeof id !== 'string') return null
    const game = getGame(id)
    if (!game) return null

    const result = await showOpenDialog({
      title: 'Choose artwork',
      buttonLabel: 'Use image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }],
    })
    const source = result.canceled ? null : result.filePaths[0]
    if (!source) return null

    const extension = path.extname(source).toLowerCase() || '.png'
    const fileName = `${game.id}-${Date.now()}${extension}`
    mkdirSync(mediaDirectory(), { recursive: true })
    copyFileSync(source, path.join(mediaDirectory(), fileName))

    const previous = game.artworkFile
    setArtwork(id, fileName)
    if (previous) await removeMediaFile(previous)
    broadcast()
    return snapshot()
  })

  ipcMain.handle('library:clear-artwork', async (_event, id: unknown) => {
    if (typeof id === 'string') {
      const game = getGame(id)
      if (game) {
        if (game.artworkFile) await removeMediaFile(game.artworkFile)
        setArtwork(id, null)
        broadcast()
      }
    }
    return snapshot()
  })

  ipcMain.handle('library:launch', async (_event, id: unknown) => {
    if (typeof id !== 'string') return { ok: false, error: 'That game is no longer in your library.' }
    const game = getGame(id)
    if (!game) return { ok: false, error: 'That game is no longer in your library.' }

    const outcome = await launchGame(game)
    broadcast()
    return outcome
  })

  ipcMain.handle('library:reveal', (_event, id: unknown) => {
    if (typeof id !== 'string') return
    const game = getGame(id)
    if (game?.launcher && existsSync(game.launcher)) shell.showItemInFolder(game.launcher)
  })

  ipcMain.handle('settings:update', (_event, patch: unknown) => {
    const before = getSettings().fullscreen
    const settings = updateSettings(readSettingsPatch(patch))
    if (settings.fullscreen !== before) applyFullscreen(settings.fullscreen)
    broadcast()
    return snapshot()
  })

  ipcMain.handle('profile:update', (_event, patch: unknown) => {
    updateProfile(readProfilePatch(patch))
    broadcast()
    return snapshot()
  })

  ipcMain.handle('trophies:add', (_event, input: unknown) => {
    const trophy = readTrophyInput(input)
    if (trophy) {
      addTrophy(trophy)
      broadcast()
    }
    return snapshot()
  })

  ipcMain.handle('trophies:update', (_event, id: unknown, patch: unknown) => {
    if (typeof id === 'string') {
      updateTrophy(id, readTrophyPatch(patch))
      broadcast()
    }
    return snapshot()
  })

  ipcMain.handle('trophies:unlock', (_event, id: unknown) => {
    if (typeof id === 'string') {
      const trophy = getTrophy(id)
      if (trophy && !trophy.unlockedAt) {
        updateTrophy(id, { progress: trophy.target })
      }
      broadcast()
    }
    return snapshot()
  })

  ipcMain.handle('trophies:remove', (_event, id: unknown) => {
    if (typeof id === 'string' && removeTrophy(id)) broadcast()
    return snapshot()
  })
}
