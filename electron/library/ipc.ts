import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron'
import type { OpenDialogOptions } from 'electron'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { statfs, unlink } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from '../launch/args'
import {
  applyLaunchPatch,
  isWatchMode,
  launchProjection,
  normaliseLaunch,
} from '../launch/config'
import { forgetGameRoot, GAME_SCHEME } from '../launch/html'
import { inspectTargets, takeCandidate, titleFromPath } from '../launch/inspect'
import { describeLaunch, runtimeExists } from '../launch/runtimes'
import {
  isRunning,
  runningGameIds,
  setSessionHandlers,
  startSession,
  stopSession,
} from '../launch/session'
import type {
  AppSnapshot,
  Game,
  GamePatch,
  LaunchDraft,
  LaunchPatch,
  LaunchPreview,
  LaunchResult,
  NewTrophy,
  ProfilePatch,
  Settings,
  SettingsPatch,
  StorageInfo,
  TrophyPatch,
  TrophyTier,
} from '../../src/types'
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
const GAME_EXTENSIONS = ['exe', 'bat', 'cmd', 'lnk', 'html', 'htm']
const ACCENTS = ['#5aa9ff', '#ff8a5c', '#ff5aa8', '#ffa94d', '#7fe0a0', '#ffd166', '#4fd8ff', '#9b8cff']
const TIERS: TrophyTier[] = ['bronze', 'silver', 'gold', 'platinum']
const THEMES = ['midnight', 'aurora', 'ember']

export function registerMediaScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
    },
    {
      // Each HTML game gets its own origin on this scheme, served out of its
      // own folder. A real origin is what makes modules, fetch and storage work.
      scheme: GAME_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ])
}

function toGame(game: StoredGame): Game {
  const description = describeLaunch(game.launch, game.id)

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
    launch: game.launch,
    launchLabel: description.label,
    launchCommand: description.command,
    launchReady: description.ready,
    launchWarning: description.warning,
    requiresTrust: description.requiresTrust,
    trusted: Boolean(game.launch.trustedAt),
    installed: game.launch.entry !== '' && existsSync(game.launch.entry),
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

function accentFor(value: string): string {
  let hash = 0
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) % 1009
  return ACCENTS[hash % ACCENTS.length]
}

/** Launch entries already in the library, lowercased for duplicate checks. */
function knownEntries(): Set<string> {
  return new Set(
    listGames()
      .map((game) => game.launch.entry.toLowerCase())
      .filter((entry) => entry !== ''),
  )
}

function entriesFor(files: string[]): { entries: NewGame[]; skipped: number } {
  const known = knownEntries()
  const entries: NewGame[] = []

  for (const file of files) {
    const key = file.toLowerCase()
    if (known.has(key)) continue
    known.add(key)

    // A file picked through the old single-file flow is trusted immediately,
    // because it was already playable before Phase 5.
    const launch = normaliseLaunch(
      { entry: file, trustedAt: Date.now() },
      { entry: file, args: '', addedAt: Date.now() },
    )
    const projection = launchProjection(launch)

    entries.push({
      title: titleFromPath(file),
      tagline: '',
      genre: '',
      accent: accentFor(file),
      favorite: false,
      launcher: projection.launcher,
      launcherArgs: projection.launcherArgs,
      launch,
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

/** Every field of an incoming launch edit is validated on its own. */
function readLaunchPatch(raw: unknown): LaunchPatch {
  if (!raw || typeof raw !== 'object') return {}
  const input = raw as Record<string, unknown>
  const patch: LaunchPatch = {}

  if (typeof input.runtime === 'string') patch.runtime = input.runtime.slice(0, 40)
  if (typeof input.root === 'string') patch.root = input.root.slice(0, 4096)
  if (typeof input.entry === 'string') patch.entry = input.entry.slice(0, 4096)
  if (typeof input.cwd === 'string') patch.cwd = input.cwd.slice(0, 4096)
  if (typeof input.argsText === 'string') patch.argsText = input.argsText.slice(0, 2000)
  if (Array.isArray(input.args)) {
    patch.args = input.args
      .filter((value): value is string => typeof value === 'string')
      .slice(0, 100)
      .map((value) => value.slice(0, 1024))
  }
  if (isWatchMode(input.watch)) patch.watch = input.watch
  if (typeof input.trust === 'boolean') patch.trust = input.trust

  return patch
}

const EMPTY_PREVIEW: LaunchPreview = {
  runtime: 'native',
  label: 'Not set up',
  command: '',
  cwd: '',
  watch: 'process',
  ready: false,
  requiresTrust: false,
  warning: null,
}

function readLaunchDraft(raw: unknown): LaunchDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as Record<string, unknown>
  if (typeof input.entry !== 'string') return null

  return {
    runtime: typeof input.runtime === 'string' ? input.runtime : undefined,
    entry: input.entry.slice(0, 4096),
    cwd: typeof input.cwd === 'string' ? input.cwd.slice(0, 4096) : undefined,
    argsText: typeof input.argsText === 'string' ? input.argsText.slice(0, 2000) : undefined,
    watch: isWatchMode(input.watch) ? input.watch : undefined,
  }
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
  setSessionHandlers({
    credit: (gameId, seconds, endedAt) => addPlaytime(gameId, seconds, endedAt),
    closed: () => broadcast(),
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

  ipcMain.handle('library:pick-target', async (_event, kind: unknown) => {
    const folder = kind === 'folder'

    const result = await showOpenDialog({
      title: folder ? 'Choose a game folder' : 'Choose game files',
      buttonLabel: folder ? 'Choose folder' : 'Choose',
      properties: folder ? ['openDirectory', 'multiSelections'] : ['openFile', 'multiSelections'],
      filters: folder
        ? undefined
        : [
            { name: 'Games', extensions: GAME_EXTENSIONS },
            { name: 'All files', extensions: ['*'] },
          ],
    })

    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('library:inspect', (_event, targets: unknown) => {
    if (!Array.isArray(targets)) return []

    const paths = targets
      .filter((value): value is string => typeof value === 'string' && path.isAbsolute(value))
      .slice(0, 50)

    return inspectTargets(paths, knownEntries())
  })

  ipcMain.handle('library:import-candidates', (_event, selection: unknown) => {
    if (!Array.isArray(selection)) return { added: 0, skipped: 0, canceled: false }

    const known = knownEntries()
    const entries: NewGame[] = []
    let skipped = 0

    for (const raw of selection.slice(0, 50)) {
      if (!raw || typeof raw !== 'object') {
        skipped += 1
        continue
      }

      const input = raw as Record<string, unknown>
      if (typeof input.token !== 'string') {
        skipped += 1
        continue
      }

      // The plan behind a token came from the main process; the renderer only
      // says which candidate to keep and whether it was trusted.
      const record = takeCandidate(input.token)
      if (!record || !record.importable) {
        skipped += 1
        continue
      }

      const key = record.launch.entry.toLowerCase()
      if (!key || known.has(key)) {
        skipped += 1
        continue
      }
      known.add(key)

      const launch =
        input.trusted === true ? { ...record.launch, trustedAt: Date.now() } : record.launch
      const projection = launchProjection(launch)

      entries.push({
        title: record.title.slice(0, 120) || titleFromPath(record.source),
        tagline: '',
        genre: '',
        accent: accentFor(record.source),
        favorite: false,
        launcher: projection.launcher,
        launcherArgs: projection.launcherArgs,
        launch,
        artworkKey: null,
        artworkFile: null,
        playtimeSeconds: 0,
        lastPlayedAt: null,
      })
    }

    const added = addGames(entries)
    if (added.length > 0) broadcast()
    return { added: added.length, skipped, canceled: false }
  })

  ipcMain.handle('launch:preview', (_event, id: unknown, raw: unknown) => {
    const draft = readLaunchDraft(raw)
    if (!draft) return EMPTY_PREVIEW

    /*
     * The preview is built through exactly the same normalisation and planning
     * code a real launch uses, so what is shown is what would run.
     */
    const config = normaliseLaunch(
      {
        runtime: draft.runtime,
        entry: draft.entry,
        cwd: draft.cwd,
        args: parseArgs(draft.argsText ?? ''),
        watch: draft.watch,
      },
      { entry: draft.entry, args: '', addedAt: Date.now() },
    )

    const description = describeLaunch(config, typeof id === 'string' ? id : undefined)

    return {
      runtime: description.runtime,
      label: description.label,
      command: description.command,
      cwd: config.cwd,
      watch: description.watch,
      ready: description.ready,
      requiresTrust: description.requiresTrust,
      warning: description.warning,
    }
  })

  ipcMain.handle('library:update-launch', (_event, id: unknown, patch: unknown) => {
    if (typeof id !== 'string') return snapshot()

    const game = getGame(id)
    if (game) {
      const next = applyLaunchPatch(game.launch, readLaunchPatch(patch), runtimeExists)
      updateGame(id, { launch: next })
      broadcast()
    }

    return snapshot()
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
      if (removed) {
        forgetGameRoot(id)
        if (removed.artworkFile) await removeMediaFile(removed.artworkFile)
        broadcast()
      }
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

  ipcMain.handle('library:launch', async (_event, id: unknown): Promise<LaunchResult> => {
    if (typeof id !== 'string') return { ok: false, error: 'That game is no longer in your library.' }
    const game = getGame(id)
    if (!game) return { ok: false, error: 'That game is no longer in your library.' }

    const outcome = await startSession(game)
    broadcast()
    return outcome
  })

  ipcMain.handle('library:stop', async (_event, id: unknown) => {
    if (typeof id === 'string' && isRunning(id)) {
      await stopSession(id)
      broadcast()
    }
    return snapshot()
  })

  ipcMain.handle('library:reveal', (_event, id: unknown) => {
    if (typeof id !== 'string') return
    const game = getGame(id)
    const target = game?.launch.entry || game?.launcher
    if (target && existsSync(target)) shell.showItemInFolder(target)
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
