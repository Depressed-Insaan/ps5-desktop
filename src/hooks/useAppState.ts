import { useCallback, useEffect, useState } from 'react'
import type {
  AppSnapshot,
  GamePatch,
  ImportCandidate,
  ImportResult,
  ImportSelection,
  LaunchDraft,
  LaunchPatch,
  LaunchPreview,
  LaunchResult,
  NewTrophy,
  ProfilePatch,
  SettingsPatch,
  TrophyPatch,
} from '@/types'

/**
 * Mirrors the defaults in electron/library/store.ts so the first paint has the
 * same accent and copy as the stored document.
 */
const FALLBACK: AppSnapshot = {
  games: [],
  runningIds: [],
  trophies: [],
  settings: {
    accent: '#5aa9ff',
    theme: 'midnight',
    startView: 'home',
    fullscreen: false,
    notifyTrophies: true,
    notifySessions: true,
  },
  profile: { name: 'Player', initials: 'P', level: 1 },
}

export interface AppController extends AppSnapshot {
  loading: boolean
  /** False when the page is open in a plain browser tab instead of Electron. */
  bridge: boolean
  importGames(): Promise<ImportResult>
  pickExecutable(): Promise<string | null>
  pickLaunchTarget(kind: 'file' | 'folder'): Promise<string[]>
  inspectPaths(paths: string[]): Promise<ImportCandidate[]>
  importCandidates(selection: ImportSelection[]): Promise<ImportResult>
  updateLaunch(id: string, patch: LaunchPatch): Promise<void>
  previewLaunch(id: string, draft: LaunchDraft): Promise<LaunchPreview | null>
  stopGame(id: string): Promise<void>
  updateGame(id: string, patch: GamePatch): Promise<void>
  removeGame(id: string): Promise<void>
  chooseArtwork(id: string): Promise<void>
  clearArtwork(id: string): Promise<void>
  launchGame(id: string): Promise<LaunchResult>
  revealGame(id: string): Promise<void>
  updateSettings(patch: SettingsPatch): Promise<AppSnapshot | null>
  updateProfile(patch: ProfilePatch): Promise<AppSnapshot | null>
  addTrophy(input: NewTrophy): Promise<AppSnapshot | null>
  updateTrophy(id: string, patch: TrophyPatch): Promise<AppSnapshot | null>
  unlockTrophy(id: string): Promise<AppSnapshot | null>
  removeTrophy(id: string): Promise<AppSnapshot | null>
}

/**
 * Keeps the renderer in step with the document owned by the main process. Every
 * change is pushed back from main, so a launch, a trophy unlock or a settings
 * edit updates the whole interface without it asking.
 */
export function useAppState(): AppController {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(FALLBACK)
  const [loading, setLoading] = useState(true)
  const bridge = Boolean(window.api)

  useEffect(() => {
    if (!bridge) {
      setLoading(false)
      return
    }

    let cancelled = false

    window.api
      .getState()
      .then((next) => {
        if (!cancelled) setSnapshot(next)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const stop = window.api.onStateChanged((next) => setSnapshot(next))

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

  const pickLaunchTarget = useCallback(async (kind: 'file' | 'folder') => {
    if (!window.api) return []
    return window.api.pickLaunchTarget(kind)
  }, [])

  const inspectPaths = useCallback(async (paths: string[]) => {
    if (!window.api) return []
    return window.api.inspectPaths(paths)
  }, [])

  const importCandidates = useCallback(async (selection: ImportSelection[]) => {
    if (!window.api) return { added: 0, skipped: 0, canceled: true }
    return window.api.importCandidates(selection)
  }, [])

  const updateLaunch = useCallback(async (id: string, patch: LaunchPatch) => {
    if (!window.api) return
    setSnapshot(await window.api.updateLaunch(id, patch))
  }, [])

  const previewLaunch = useCallback(async (id: string, draft: LaunchDraft) => {
    if (!window.api) return null
    return window.api.previewLaunch(id, draft)
  }, [])

  const stopGame = useCallback(async (id: string) => {
    if (!window.api) return
    setSnapshot(await window.api.stopGame(id))
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

  const updateSettings = useCallback(async (patch: SettingsPatch) => {
    if (!window.api) return null
    const next = await window.api.updateSettings(patch)
    setSnapshot(next)
    return next
  }, [])

  const updateProfile = useCallback(async (patch: ProfilePatch) => {
    if (!window.api) return null
    const next = await window.api.updateProfile(patch)
    setSnapshot(next)
    return next
  }, [])

  const addTrophy = useCallback(async (input: NewTrophy) => {
    if (!window.api) return null
    const next = await window.api.addTrophy(input)
    setSnapshot(next)
    return next
  }, [])

  const updateTrophy = useCallback(async (id: string, patch: TrophyPatch) => {
    if (!window.api) return null
    const next = await window.api.updateTrophy(id, patch)
    setSnapshot(next)
    return next
  }, [])

  const unlockTrophy = useCallback(async (id: string) => {
    if (!window.api) return null
    const next = await window.api.unlockTrophy(id)
    setSnapshot(next)
    return next
  }, [])

  const removeTrophy = useCallback(async (id: string) => {
    if (!window.api) return null
    const next = await window.api.removeTrophy(id)
    setSnapshot(next)
    return next
  }, [])

  return {
    ...snapshot,
    loading,
    bridge,
    importGames,
    pickExecutable,
    pickLaunchTarget,
    inspectPaths,
    importCandidates,
    updateLaunch,
    previewLaunch,
    stopGame,
    updateGame,
    removeGame,
    chooseArtwork,
    clearArtwork,
    launchGame,
    revealGame,
    updateSettings,
    updateProfile,
    addTrophy,
    updateTrophy,
    unlockTrophy,
    removeTrophy,
  }
}
