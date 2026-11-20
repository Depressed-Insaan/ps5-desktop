import { BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron'
import type { OpenDialogOptions } from 'electron'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Game, GamePatch, LibrarySnapshot } from '../../src/types'
import { launchGame, runningGameIds, setSessionEndHandler } from './launch'
import {
  addGames,
  addPlaytime,
  getGame,
  listGames,
  mediaDirectory,
  removeGame,
  setArtwork,
  updateGame,
} from './store'
import type { NewGame } from './store'

/** Custom scheme used for artwork the user supplies from disk. */
export const MEDIA_SCHEME = 'app-media'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif']
const GAME_EXTENSIONS = ['exe', 'bat', 'cmd', 'lnk']
const ACCENTS = ['#5aa9ff', '#ff8a5c', '#ff5aa8', '#ffa94d', '#7fe0a0', '#ffd166', '#4fd8ff', '#9b8cff']

export function registerMediaScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
    },
  ])
}

function toGame(game: ReturnType<typeof listGames>[number]): Game {
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

function snapshot(): LibrarySnapshot {
  return { games: listGames().map(toGame), runningIds: runningGameIds() }
}

function broadcast() {
  const next = snapshot()
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('library:changed', next)
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

  ipcMain.handle('library:get', () => snapshot())

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
}
