/**
 * Display helpers for library values. The library itself lives in the main
 * process; the renderer only formats the numbers it receives.
 */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Two-letter stand-in used when a game has no artwork. */
export function initialsFor(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** `48 h`, `45 min`, or an empty string for a game that was never played. */
export function formatPlaytime(minutes: number): string {
  if (minutes <= 0) return ''
  if (minutes < 60) return `${Math.round(minutes)} min`

  const hours = minutes / 60
  if (hours < 10) return `${hours.toFixed(1).replace(/\.0$/, '')} h`
  return `${Math.round(hours)} h`
}

export function formatLastPlayed(at: number | null): string {
  if (!at) return 'Never played'

  const elapsed = Date.now() - at
  const minutes = Math.floor(elapsed / MINUTE)
  if (minutes < 1) return 'Played just now'
  if (minutes < 60) return `Played ${minutes} min ago`

  const hours = Math.floor(elapsed / HOUR)
  if (hours === 1) return 'Played 1 hour ago'
  if (hours < 24) return `Played ${hours} hours ago`

  const days = Math.floor(elapsed / DAY)
  if (days === 1) return 'Played yesterday'
  if (days < 7) return `Played ${days} days ago`
  if (days < 14) return 'Played last week'
  if (days < 30) return `Played ${Math.floor(days / 7)} weeks ago`
  if (days < 60) return 'Played last month'
  if (days < 365) return `Played ${Math.floor(days / 30)} months ago`
  return 'Played over a year ago'
}
