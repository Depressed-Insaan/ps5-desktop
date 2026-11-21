import { BrowserWindow, net, session } from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { resolveWithin } from './paths'

/**
 * HTML games run in their own window, on their own origin, with no bridge.
 *
 * Assets are served from a per-game standard scheme rather than `file://`:
 * ES modules, `fetch()` and `localStorage` all behave normally on a real
 * origin, while `file://` breaks all three. The scheme is registered only on
 * that game's partitioned session, so a game can never read `app-media://`
 * artwork or another game's files.
 */

export const GAME_SCHEME = 'ani-game'

const windows = new Map<string, BrowserWindow>()
const prepared = new Set<string>()
const roots = new Map<string, string>()

export function setGameRoot(gameId: string, root: string) {
  roots.set(gameId, root)
}

export function forgetGameRoot(gameId: string) {
  roots.delete(gameId)
}

function schemeFor(gameId: string) {
  return `${GAME_SCHEME}://${gameId}`
}

function isGameUrl(raw: string, gameId: string): boolean {
  try {
    const url = new URL(raw)
    return `${url.protocol}//${url.hostname}` === schemeFor(gameId)
  } catch {
    return false
  }
}

/** A request path can only ever resolve inside the game's own folder. */
async function serveAsset(gameId: string, requestUrl: string): Promise<Response> {
  const root = roots.get(gameId)
  if (!root) return new Response('Not found', { status: 404 })

  let relative: string
  try {
    relative = decodeURIComponent(new URL(requestUrl).pathname).replace(/^\/+/, '')
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  const file = resolveWithin(root, relative || 'index.html')
  if (!file) return new Response('Forbidden', { status: 403 })

  return net.fetch(pathToFileURL(file).toString())
}

function prepareSession(gameId: string) {
  const partition = `persist:anigame-${gameId}`
  const target = session.fromPartition(partition)

  if (!prepared.has(gameId)) {
    prepared.add(gameId)
    target.protocol.handle(GAME_SCHEME, (request) => serveAsset(gameId, request.url))

    // Games get no hardware, media or notification access, and no permission
    // prompt: a launcher has no business approving a game's camera request.
    target.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
    target.setPermissionCheckHandler(() => false)
  }

  return target
}

export interface GameWindowOptions {
  gameId: string
  title: string
  root: string
  entry: string
  onClosed: () => void
}

export function openGameWindow(options: GameWindowOptions): BrowserWindow {
  const { gameId, title, root, entry, onClosed } = options

  setGameRoot(gameId, root)
  prepareSession(gameId)

  const relative = path
    .relative(root, entry)
    .split(path.sep)
    .map(encodeURIComponent)
    .join('/')

  const window = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 640,
    minHeight: 420,
    show: false,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    title,
    webPreferences: {
      partition: `persist:anigame-${gameId}`,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
      spellcheck: false,
      // No preload at all: the game must never see the Ani Games bridge.
    },
  })

  window.setMenuBarVisibility(false)
  windows.set(gameId, window)

  // Popups are never wanted, and navigation outside the game's own origin is
  // always a bug or an escape attempt.
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, url) => {
    if (!isGameUrl(url, gameId)) event.preventDefault()
  })
  window.webContents.on('will-attach-webview', (event) => event.preventDefault())

  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      window.setFullScreen(!window.isFullScreen())
      event.preventDefault()
    }
  })

  window.once('ready-to-show', () => window.show())
  window.on('closed', () => {
    windows.delete(gameId)
    prepared.delete(gameId)
    onClosed()
  })

  void window.loadURL(`${schemeFor(gameId)}/${relative}`)
  return window
}

export function closeGameWindow(gameId: string): void {
  const window = windows.get(gameId)
  if (window && !window.isDestroyed()) window.destroy()
}
