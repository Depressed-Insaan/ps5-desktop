import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { StoredGame } from './store'

interface Session {
  child: ChildProcess
  startedAt: number
}

const sessions = new Map<string, Session>()

type SessionEndHandler = (gameId: string, seconds: number, endedAt: number) => void
let handleSessionEnd: SessionEndHandler = () => {}

export function setSessionEndHandler(handler: SessionEndHandler) {
  handleSessionEnd = handler
}

export function runningGameIds(): string[] {
  return [...sessions.keys()]
}

/** Splits a stored argument string, honouring double and single quotes. */
function parseArgs(raw: string): string[] {
  const parts = raw.match(/"([^"]*)"|'([^']*)'|\S+/g) ?? []
  return parts.map((part) => part.replace(/^["']|["']$/g, '')).filter(Boolean)
}

function finish(gameId: string) {
  const session = sessions.get(gameId)
  if (!session) return

  sessions.delete(gameId)
  const endedAt = Date.now()
  const seconds = Math.max(1, Math.round((endedAt - session.startedAt) / 1000))
  handleSessionEnd(gameId, seconds, endedAt)
}

export interface LaunchOutcome {
  ok: boolean
  error?: string
}

export async function launchGame(game: StoredGame): Promise<LaunchOutcome> {
  if (!game.launcher) return { ok: false, error: 'This game has no launch target yet.' }
  if (!existsSync(game.launcher)) {
    return { ok: false, error: 'That file is no longer where it was.' }
  }
  if (sessions.has(game.id)) return { ok: true }

  const args = parseArgs(game.launcherArgs)
  const cwd = path.dirname(game.launcher)
  const isExecutable = path.extname(game.launcher).toLowerCase() === '.exe'

  let child: ChildProcess
  try {
    /*
     * A direct executable is tracked so its playtime is accurate. Shortcuts and
     * batch files are handed to the shell's `start`, which detaches from us.
     */
    child = isExecutable
      ? spawn(game.launcher, args, { cwd, detached: true, stdio: 'ignore' })
      : spawn(
          process.env.ComSpec ?? 'cmd.exe',
          ['/c', 'start', '', game.launcher, ...args],
          { cwd, detached: true, stdio: 'ignore', windowsHide: true },
        )
  } catch (error) {
    console.warn('[library] Could not start game.', error)
    return { ok: false, error: 'This game could not be started.' }
  }

  // Register before awaiting `spawn` so a process that exits immediately is
  // still noticed, and still contributes its playtime.
  sessions.set(game.id, { child, startedAt: Date.now() })
  child.once('exit', () => finish(game.id))

  let settled = false
  const started = await new Promise<boolean>((resolve) => {
    child.once('spawn', () => {
      settled = true
      resolve(true)
    })
    child.on('error', (error) => {
      if (!settled) {
        settled = true
        sessions.delete(game.id)
        console.warn('[library] Could not start game.', error)
        resolve(false)
      }
    })
  })

  if (!started) return { ok: false, error: 'This game could not be started.' }

  child.unref()
  return { ok: true }
}

/** Records the elapsed time of every session still open, e.g. while quitting. */
export function finishAllSessions() {
  for (const gameId of [...sessions.keys()]) finish(gameId)
}
