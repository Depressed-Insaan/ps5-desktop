const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

/** Formats a byte count with a readable unit, e.g. `1.82 TB`. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'

  const exponent = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** exponent
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2

  return `${value.toFixed(digits)} ${UNITS[exponent]}`
}

export function usedShare(usedBytes: number, totalBytes: number): number {
  if (!totalBytes) return 0
  return Math.min(100, Math.max(0, Math.round((usedBytes / totalBytes) * 100)))
}
