import { useCallback } from 'react'
import type { KeyboardEvent } from 'react'

const GRID_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'])

/**
 * Arrow-key navigation across the dashboard shelves. Rows are marked with
 * `data-nav-row` and tiles with `data-nav-item`, so the same movement model
 * can later be driven by a gamepad without touching the components.
 */
export function useDashboardNav() {
  return useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!GRID_KEYS.has(event.key)) return

    const current = event.target as HTMLElement
    if (!current.matches('[data-nav-item]')) return

    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-nav-row]'))
    const rowIndex = rows.findIndex((row) => row.contains(current))
    if (rowIndex === -1) return

    const items = Array.from(rows[rowIndex].querySelectorAll<HTMLElement>('[data-nav-item]'))
    const index = items.indexOf(current)

    let next: HTMLElement | undefined

    if (event.key === 'ArrowLeft') next = items[index - 1]
    else if (event.key === 'ArrowRight') next = items[index + 1]
    else if (event.key === 'Home') next = items[0]
    else if (event.key === 'End') next = items[items.length - 1]
    else {
      // Vertical movement keeps the column position where the next row allows it.
      const step = event.key === 'ArrowUp' ? -1 : 1
      for (let row = rowIndex + step; row >= 0 && row < rows.length; row += step) {
        const candidates = Array.from(rows[row].querySelectorAll<HTMLElement>('[data-nav-item]'))
        if (candidates.length > 0) {
          next = candidates[Math.min(index, candidates.length - 1)]
          break
        }
      }
    }

    if (!next) return
    event.preventDefault()
    // Focusing also scrolls the tile into view inside its shelf.
    next.focus()
  }, [])
}
