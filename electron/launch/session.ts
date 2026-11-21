import { execFile, spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { shell } from 'electron'
import type { LaunchConfig, LaunchResult, WatchMode } from '../../src/types'
import { childEnvironment } from './args'
import { requiresTrust } from './config'
import { closeGameWindow, openGameWindow } from './html'
import { planFor } from './runtimes'

/**
 * The single spawner.
 *
 * Every runtime funnels through here: one `spawn` with `shell: false`, one
 * session record, and one of four watchers deciding when the session is over.
 * Nothing is ever handed to a shell to interpret, and nothing is elevated.
 */

const CHECKPOINT_INTERVAL = 60_000
const TREE_INTERVAL = 3_000
const TREE_EMPTY_POLLS = 3
const TREE_LIMIT = 8 * 3_600_000

export interface LaunchableGame {
  id: string
  title: string
  launch: LaunchConfig
}

interface Session {
  gameId: string
  watch: WatchMode
  startedAt: number
  lastCreditAt: number
  credited: number
  child: ChildProcess | null
  treeTimer: NodeJS.Timeout | null
  /** Descendants seen recently, so Stop can still end them once the launcher is gone. */
  pids: Map<number, number>
  emptyPolls: number
  polling: boolean
}

const sessions = new Map<string, Session>()

let creditPlaytime: (gameId: string, seconds: number, endedAt: number) => void = () => {}
let sessionClosed: (gameId: string) => void = () => {}
let checkpointTimer: NodeJS.Timeout | null = null

export function setSessionHandlers(handlers: {
  credit: (gameId: string, seconds: number, endedAt: number) => void
  closed: (gameId: string) => void
}) {
  creditPlaytime = handlers.credit
  sessionClosed = handlers.closed
}

export function runningGameIds(): string[] {
  return [...sessions.keys()]
}

export function isRunning(gameId: string): boolean {
  return sessions.has(gameId)
}

function creditSession(session: Session) {
  const now = Date.now()
  const elapsed = Math.round((now - session.lastCreditAt) / 1000)
  if (elapsed < 1) return

  session.lastCreditAt += elapsed * 1000
  session.credited += elapsed
  creditPlaytime(session.gameId, elapsed, now)
}

function ensureCheckpoints() {
  if (checkpointTimer) return

  // An open session is banked every minute, so a crash or a power cut can only
  // ever cost the last minute of playtime.
  checkpointTimer = setInterval(() => {
    for (const session of sessions.values()) creditSession(session)
  }, CHECKPOINT_INTERVAL)
}

function stopCheckpoints() {
  if (!checkpointTimer) return
  clearInterval(checkpointTimer)
  checkpointTimer = null
}

function endSession(gameId: string) {
  const session = sessions.get(gameId)
  if (!session) return

  sessions.delete(gameId)
  stopTreeWatch(session)
  creditSession(session)

  // A launch that lasted under a second still counts, exactly as it did before.
  if (session.credited === 0) creditPlaytime(gameId, 1, Date.now())

  if (sessions.size === 0) stopCheckpoints()
  sessionClosed(gameId)
}

function begin(game: LaunchableGame, watch: WatchMode, child: ChildProcess | null): Session {
  const now = Date.now()
  const session: Session = {
    gameId: game.id,
    watch,
    startedAt: now,
    lastCreditAt: now,
    credited: 0,
    child,
    treeTimer: null,
    pids: new Map(),
    emptyPolls: 0,
    polling: false,
  }

  sessions.set(game.id, session)
  ensureCheckpoints()

  if (child) {
    child.once('exit', () => {
      if (sessions.get(game.id) !== session) return

      /*
       * `manual` never ends on its own. `tree` waits for the game's children
       * because the process we started is often only a bootstrap (Unity,
       * Unreal, NW.js) that exits while the real game keeps running.
       */
      if (watch === 'manual') return
      if (watch === 'tree' && child.pid) {
        startTreeWatch(session, child.pid)
        return
      }
      endSession(game.id)
    })
  }

  return session
}

const PROCESS_SCRIPT =
  'Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId | ForEach-Object { "$($_.ProcessId),$($_.ParentProcessId)" }'

/** One cheap, read-only process snapshot, used only by the tree watcher. */
function processTable(): Promise<Map<number, number[]>> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', PROCESS_SCRIPT],
      { windowsHide: true, timeout: 5_000, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(error)
          return
        }

        const children = new Map<number, number[]>()
        for (const line of stdout.split(/\r?\n/)) {
          const [pidText, parentText] = line.trim().split(',')
          const pid = Number(pidText)
          const parent = Number(parentText)
          if (!Number.isInteger(pid) || !Number.isInteger(parent) || pid <= 0) continue

          const list = children.get(parent) ?? []
          list.push(pid)
          children.set(parent, list)
        }
        resolve(children)
      },
    )
  })
}

async function descendantsOf(rootPid: number): Promise<number[]> {
  const children = await processTable()
  const found: number[] = []
  const queue = [rootPid]

  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) break

    for (const child of children.get(current) ?? []) {
      found.push(child)
      queue.push(child)
    }
    if (found.length > 512) break
  }

  return found
}

async function pollTree(session: Session, rootPid: number) {
  if (session.polling || !sessions.has(session.gameId)) return
  if (Date.now() - session.startedAt > TREE_LIMIT) {
    endSession(session.gameId)
    return
  }

  session.polling = true
  try {
    const alive = await descendantsOf(rootPid)
    if (alive.length > 0) {
      session.emptyPolls = 0
      const seenAt = Date.now()
      for (const pid of alive) session.pids.set(pid, seenAt)
      return
    }

    session.emptyPolls += 1
    if (session.emptyPolls >= TREE_EMPTY_POLLS) endSession(session.gameId)
  } catch (error) {
    // If the tree cannot be observed, ending the session is safer than leaving
    // it open forever.
    console.warn('[launch] Could not observe the game process.', error)
    endSession(session.gameId)
  } finally {
    session.polling = false
  }
}

function startTreeWatch(session: Session, rootPid: number) {
  if (session.treeTimer) return

  void pollTree(session, rootPid)
  session.treeTimer = setInterval(() => void pollTree(session, rootPid), TREE_INTERVAL)
}

function stopTreeWatch(session: Session) {
  if (!session.treeTimer) return
  clearInterval(session.treeTimer)
  session.treeTimer = null
}

function killProcessTree(pid: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      const killer = spawn('taskkill', ['/pid', String(pid), '/t', '/f'], {
        windowsHide: true,
        stdio: 'ignore',
      })
      killer.once('error', () => resolve())
      killer.once('exit', () => resolve())
    } catch {
      // Nothing to kill.
      resolve()
    }
  })
}

async function openUrl(target: string): Promise<string | null> {
  try {
    await shell.openExternal(target)
    return null
  } catch (error) {
    console.warn('[launch] Could not open the shortcut.', error)
    return 'That shortcut could not be opened.'
  }
}

export async function startSession(game: LaunchableGame): Promise<LaunchResult> {
  if (sessions.has(game.id)) return { ok: true }

  const plan = planFor(game.launch)
  if (plan.kind === 'failure') return { ok: false, error: plan.error }

  if (requiresTrust(game.launch) && !game.launch.trustedAt) {
    return { ok: false, error: 'Review and trust this game before playing it.' }
  }

  if (plan.kind === 'window') {
    try {
      openGameWindow({
        gameId: game.id,
        title: game.title,
        root: plan.root,
        entry: plan.entry,
        onClosed: () => endSession(game.id),
      })
    } catch (error) {
      console.warn('[launch] Could not open the game window.', error)
      return { ok: false, error: 'This game could not be opened.' }
    }

    begin(game, plan.watch, null)
    return { ok: true }
  }

  if (plan.kind === 'open') {
    const failure = plan.mode === 'url' ? await openUrl(plan.target) : await shell.openPath(plan.target)
    if (failure) return { ok: false, error: failure }

    begin(game, 'manual', null)
    return { ok: true }
  }

  let child: ChildProcess
  try {
    child = spawn(plan.command, plan.args, {
      cwd: plan.cwd,
      env: childEnvironment(plan.env),
      shell: false,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
  } catch (error) {
    console.warn('[launch] Could not start game.', error)
    return { ok: false, error: 'This game could not be started.' }
  }

  // Register before awaiting `spawn` so a process that exits immediately is
  // still noticed, and still contributes its playtime.
  const session = begin(game, plan.watch, child)

  let settled = false
  const started = await new Promise<boolean>((resolve) => {
    child.once('spawn', () => {
      settled = true
      resolve(true)
    })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      console.warn('[launch] Could not start game.', error)
      if (sessions.get(game.id) === session) sessions.delete(game.id)
      stopTreeWatch(session)
      resolve(false)
    })
  })

  if (!started) {
    if (sessions.size === 0) stopCheckpoints()
    return { ok: false, error: 'This game could not be started.' }
  }

  child.unref()
  return { ok: true }
}

export async function stopSession(gameId: string): Promise<boolean> {
  const session = sessions.get(gameId)
  if (!session) return false

  if (session.child?.pid) await killProcessTree(session.child.pid)

  /*
   * A tree session's launcher is often gone by the time the user presses Stop,
   * so the descendants observed recently are ended directly. Old observations
   * are ignored: a reused PID must never be killed.
   */
  const now = Date.now()
  for (const [pid, seenAt] of session.pids) {
    if (now - seenAt > 15_000) continue
    await killProcessTree(pid)
  }

  closeGameWindow(gameId)
  endSession(gameId)
  return true
}

/** Banks and closes every open session, e.g. while the app is quitting. */
export function finishAllSessions() {
  for (const gameId of [...sessions.keys()]) endSession(gameId)
}
