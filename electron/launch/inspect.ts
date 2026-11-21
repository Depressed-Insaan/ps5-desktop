import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { ImportCandidate, LaunchConfig } from '../../src/types'
import { describeLaunch, detectAll } from './runtimes'
import { isDirectory } from './paths'

/**
 * Turns files and folders into ranked import candidates.
 *
 * The renderer only ever sees a token for each candidate; the launch plan that
 * token refers to stays here, so a compromised renderer cannot invent a command
 * for the main process to run.
 */

interface CachedCandidate {
  launch: LaunchConfig
  source: string
  title: string
  importable: boolean
  createdAt: number
}

const cache = new Map<string, CachedCandidate>()
const CACHE_TTL = 10 * 60_000
const CACHE_LIMIT = 200
/** Detections this close to the best one count as genuine alternatives. */
const CLOSE_SCORE = 12

export function titleFromPath(file: string): string {
  const name = path.basename(file, path.extname(file))
  const cleaned = name.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned || path.basename(file)
}

function purgeExpired() {
  const now = Date.now()
  for (const [token, record] of cache) {
    if (now - record.createdAt > CACHE_TTL) cache.delete(token)
  }
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next()
    if (oldest.done) break
    cache.delete(oldest.value)
  }
}

/** Consumes a candidate token exactly once. */
export function takeCandidate(token: string): CachedCandidate | null {
  purgeExpired()

  const record = cache.get(token)
  if (!record) return null

  cache.delete(token)
  return Date.now() - record.createdAt > CACHE_TTL ? null : record
}

export function inspectTargets(targets: string[], knownEntries: Set<string>): ImportCandidate[] {
  purgeExpired()
  const candidates: ImportCandidate[] = []

  for (const target of targets) {
    if (!target || !existsSync(target)) continue

    const folder = isDirectory(target)
    const detections = detectAll(target)
    const token = randomUUID()
    const title = titleFromPath(target)

    if (detections.length === 0) {
      cache.set(token, {
        launch: {
          runtime: 'native',
          root: '',
          entry: '',
          cwd: '',
          args: [],
          env: {},
          watch: 'process',
          trustedAt: null,
        },
        source: target,
        title,
        importable: false,
        createdAt: Date.now(),
      })

      candidates.push({
        token,
        source: target,
        title,
        kind: folder ? 'folder' : 'file',
        runtime: '',
        runtimeLabel: 'Not supported yet',
        entry: '',
        cwd: '',
        watch: 'process',
        command: '',
        requiresTrust: false,
        ambiguous: false,
        alreadyImported: false,
        importable: false,
        warning: 'Nothing here looks like something Ani Games can start yet.',
        notes: [],
      })
      continue
    }

    const best = detections[0]
    const ambiguous = detections.filter((entry) => entry.score >= best.score - CLOSE_SCORE).length > 1
    const requiresTrust = best.requiresTrust

    const launch: LaunchConfig = {
      runtime: best.runtime,
      root: folder ? target : path.dirname(best.entry),
      entry: best.entry,
      cwd: best.cwd,
      args: [],
      env: {},
      watch: best.watch,
      trustedAt: requiresTrust ? null : Date.now(),
    }

    cache.set(token, {
      launch,
      source: target,
      title,
      importable: true,
      createdAt: Date.now(),
    })

    const description = describeLaunch(launch)
    candidates.push({
      token,
      source: target,
      title,
      kind: folder ? 'folder' : 'file',
      runtime: best.runtime,
      runtimeLabel: best.label,
      entry: best.entry,
      cwd: best.cwd,
      watch: best.watch,
      command: description.command,
      requiresTrust,
      ambiguous,
      alreadyImported:
        knownEntries.has(best.entry.toLowerCase()) || knownEntries.has(target.toLowerCase()),
      importable: true,
      warning: description.warning,
      notes: best.notes,
    })
  }

  return candidates
}
