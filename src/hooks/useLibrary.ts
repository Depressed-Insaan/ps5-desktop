import { useCallback, useEffect, useState } from 'react'
import type { Game, GamePatch, ImportResult, LaunchResult, LibrarySnapshot } from '@/types'

const EMPTY: LibrarySnapshot = { games: [], runningIds: [] }

export interface LibraryController {
  games: Game[]
  runningIds: string[]
  loading: boolean
  /** False when the page is open in a plain browser tab instead of Electron. */
  bridge: boolean
  importGames(): Promise<ImportResult>
  pickExecutable(): Promise<string | null>
  updateGame(id: string, patch: GamePatch): Promise<void>
  removeGame(id: string): Promise<void>
  chooseArtwork(id: string): Promise<void>
  clearArtwork(id: string): Promise<void>
  launchGame(id: string): Promise<LaunchResult>
  revealGame(id: string): Promise<void>
}

/**
 * Keeps the renderer in step with the library owned by the main process. Every
 * change is pushed back from main, so a launch or a finished session updates
 * playtime without the screens asking for it.
 */
export function useLibrary(): LibraryController {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot>(EMPTY)
  const [loading, setLoading] = useState(true)
  const bridge = Boolean(window.api)

  useEffect(() => {
    if (!bridge) {
      setLoading(false)
      return
    }

    let cancelled = false

    window.api
      .getLibrary()
      .then((next) => {
        if (!cancelled) setSnapshot(next)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const stop = window.api.onLibraryChanged((next) => setSnapshot(next))

    return () => {
      cancelled = true
      stop()
    }
  }, [bridge])

  const importGames = useCallback(async (): Promise<ImportResult> => {
    if (!window.api) return { added: 0, skipped: 0, canceled: true }
    return window.api.importGames()
  }, [])

  const pickExecutable = useCallback(async () => {
    if (!window.api) return null
    return window.api.pickExecutable()
  }, [])

  const updateGame = useCallback(async (id: string, patch: GamePatch) => {
    if (!window.api) return
    setSnapshot(await window.api.updateGame(id, patch))
  }, [])

  const removeGame = useCallback(async (id: string) => {
    if (!window.api) return
    setSnapshot(await window.api.removeGame(id))
  }, [])

  const chooseArtwork = useCallback(async (id: string) => {
    if (!window.api) return
    const next = await window.api.chooseArtwork(id)
    if (next) setSnapshot(next)
  }, [])

  const clearArtwork = useCallback(async (id: string) => {
    if (!window.api) return
    setSnapshot(await window.api.clearArtwork(id))
  }, [])

  const launchGame = useCallback(async (id: string): Promise<LaunchResult> => {
    if (!window.api) return { ok: false, error: 'Launching games needs the desktop app.' }
    return window.api.launchGame(id)
  }, [])

  const revealGame = useCallback(async (id: string) => {
    if (!window.api) return
    await window.api.revealGame(id)
  }, [])

  return {
    games: snapshot.games,
    runningIds: snapshot.runningIds,
    loading,
    bridge,
    importGames,
    pickExecutable,
    updateGame,
    removeGame,
    chooseArtwork,
    clearArtwork,
    launchGame,
    revealGame,
  }
}
