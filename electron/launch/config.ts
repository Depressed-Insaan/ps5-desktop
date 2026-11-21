import path from 'node:path'
import type { LaunchConfig, LaunchPatch, WatchMode } from '../../src/types'
import { formatArgs, parseArgs } from './args'
import { isDirectory, withinRoot } from './paths'

const WATCH_MODES: WatchMode[] = ['process', 'tree', 'window', 'manual']
const HTML_EXTENSIONS = ['.html', '.htm']
/** Scripts, shortcuts and shell files must be trusted before they can run. */
const SCRIPT_EXTENSIONS = ['.bat', '.cmd', '.ps1', '.lnk', '.url']

export function isWatchMode(value: unknown): value is WatchMode {
  return WATCH_MODES.includes(value as WatchMode)
}

export function requiresTrust(config: LaunchConfig): boolean {
  return SCRIPT_EXTENSIONS.includes(path.extname(config.entry).toLowerCase())
}

/** Only the extension decides this; adapters may still override it. */
export function runtimeForEntry(entry: string): string {
  return HTML_EXTENSIONS.includes(path.extname(entry).toLowerCase()) ? 'html' : 'native'
}

export function emptyLaunch(): LaunchConfig {
  return {
    runtime: 'native',
    root: '',
    entry: '',
    cwd: '',
    args: [],
    env: {},
    watch: 'process',
    trustedAt: null,
  }
}

export function defaultLaunch(entry: string, watch: WatchMode = 'process'): LaunchConfig {
  if (!entry) return emptyLaunch()

  const root = path.dirname(entry)
  return {
    runtime: runtimeForEntry(entry),
    root,
    entry,
    cwd: root,
    args: [],
    env: {},
    watch,
    trustedAt: null,
  }
}

function cleanArgs(values: unknown[]): string[] {
  return values
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .slice(0, 100)
    .map((value) => value.slice(0, 1024))
}

function normaliseEnv(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {}

  const environment: Record<string, string> = {}
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue
    if (typeof value !== 'string' || value.length > 4096) continue
    environment[name] = value
    if (Object.keys(environment).length >= 50) break
  }
  return environment
}

/**
 * Reads a stored launch descriptor, or rebuilds one from the pre-Phase-5
 * `launcher`/`launcherArgs` pair. Documents that only carry the old fields are
 * therefore upgraded in place, with no re-import and no data loss.
 */
export function normaliseLaunch(
  raw: unknown,
  fallback: { entry: string; args: string; addedAt: number },
): LaunchConfig {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  const entry =
    typeof input.entry === 'string' && input.entry.trim() ? input.entry.trim() : fallback.entry
  const runtime =
    typeof input.runtime === 'string' && input.runtime.trim()
      ? input.runtime.trim()
      : runtimeForEntry(entry)
  const root =
    typeof input.root === 'string' && input.root.trim()
      ? input.root.trim()
      : entry
        ? path.dirname(entry)
        : ''

  const storedCwd = typeof input.cwd === 'string' && input.cwd.trim() ? input.cwd.trim() : root
  const cwd = storedCwd && isDirectory(storedCwd) && withinRoot(root, storedCwd) ? storedCwd : root

  const args = Array.isArray(input.args) ? cleanArgs(input.args) : parseArgs(fallback.args)
  const watch = isWatchMode(input.watch) ? input.watch : 'process'

  let trustedAt: number | null = null
  if (typeof input.trustedAt === 'number') {
    trustedAt = input.trustedAt
  } else if (input.trustedAt === null) {
    trustedAt = null
  } else if (entry) {
    // Documents written before Phase 5 never carried a trust decision; those
    // games were playable then, so they stay playable now.
    trustedAt = fallback.addedAt
  }

  return {
    runtime,
    root,
    entry,
    cwd,
    args,
    env: normaliseEnv(input.env),
    watch,
    trustedAt,
  }
}

/**
 * Applies an edit. Anything that changes *what* will run clears the trust
 * decision, so an approved command can never silently become another one.
 */
export function applyLaunchPatch(
  current: LaunchConfig,
  patch: LaunchPatch,
  runtimeExists: (id: string) => boolean,
): LaunchConfig {
  const entry = typeof patch.entry === 'string' ? patch.entry.trim() : current.entry
  const runtime =
    typeof patch.runtime === 'string' && runtimeExists(patch.runtime)
      ? patch.runtime
      : entry
        ? runtimeForEntry(entry)
        : current.runtime

  const rootPatch = typeof patch.root === 'string' ? patch.root.trim() : ''
  const root =
    rootPatch ||
    (entry && current.root && withinRoot(current.root, entry) ? current.root : '') ||
    (entry ? path.dirname(entry) : '')

  const cwdPatch = typeof patch.cwd === 'string' ? patch.cwd.trim() : ''
  const desiredCwd = cwdPatch || current.cwd
  const cwd =
    desiredCwd && isDirectory(desiredCwd) && withinRoot(root, desiredCwd) ? desiredCwd : root

  const args =
    patch.argsText !== undefined
      ? parseArgs(patch.argsText)
      : patch.args !== undefined
        ? cleanArgs(patch.args)
        : current.args

  const watch = isWatchMode(patch.watch) ? patch.watch : current.watch

  const changed =
    entry !== current.entry ||
    runtime !== current.runtime ||
    watch !== current.watch ||
    args.join('\u0000') !== current.args.join('\u0000')

  const trustedAt =
    patch.trust === true ? Date.now() : patch.trust === false ? null : changed ? null : current.trustedAt

  return { runtime, root, entry, cwd, args, env: current.env, watch, trustedAt }
}

/**
 * The pre-Phase-5 fields stay written so older documents, the editor form and
 * any code that has not migrated yet keep seeing a sensible launch target.
 */
export function launchProjection(config: LaunchConfig): { launcher: string; launcherArgs: string } {
  return { launcher: config.entry, launcherArgs: formatArgs(config.args) }
}
