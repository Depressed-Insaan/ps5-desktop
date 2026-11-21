import { realpathSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * Paths that come from the renderer are never trusted. Everything is resolved
 * through the real path first, so `..`, symlinks and junctions cannot be used
 * to point a launch at a file outside the folder the user imported.
 */

export function realPath(target: string): string | null {
  if (!target) return null
  try {
    return realpathSync.native(target)
  } catch {
    return null
  }
}

export function isFile(target: string): boolean {
  try {
    return statSync(target).isFile()
  } catch {
    return false
  }
}

export function isDirectory(target: string): boolean {
  try {
    return statSync(target).isDirectory()
  } catch {
    return false
  }
}

/** True when `target` resolves to `root` or to something inside it. */
export function withinRoot(root: string, target: string): boolean {
  if (!root || !target) return false

  const base = realPath(root)
  const full = realPath(target)
  if (!base || !full) return false

  const relative = path.relative(base, full)
  if (relative === '') return true
  return !relative.startsWith('..') && !path.isAbsolute(relative)
}

/** Resolves a request path such as `/index.html` inside a game folder. */
export function resolveWithin(root: string, relative: string): string | null {
  if (!root || !relative) return null

  const candidate = path.resolve(root, relative)
  return withinRoot(root, candidate) ? candidate : null
}
