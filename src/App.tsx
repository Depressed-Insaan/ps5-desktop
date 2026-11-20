import { useCallback, useEffect, useRef, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { Toast } from '@/components/Toast'
import { GameEditor } from '@/components/GameEditor'
import { HomeScreen } from '@/screens/HomeScreen'
import { LibraryScreen } from '@/screens/LibraryScreen'
import { TrophiesScreen } from '@/screens/TrophiesScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { useAppState } from '@/hooks/useAppState'
import type { AppInfo, StorageInfo, ViewId } from '@/types'
import './App.css'

const STORAGE_REFRESH = 60_000
const UNAVAILABLE_STORAGE: StorageInfo = {
  available: false,
  drive: '',
  totalBytes: 0,
  usedBytes: 0,
  freeBytes: 0,
}

export default function App() {
  const app = useAppState()
  const [view, setView] = useState<ViewId>('home')
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startApplied = useRef(false)
  const previousRunning = useRef<string[] | null>(null)

  useEffect(() => {
    let cancelled = false

    // The bridge is absent when the page is opened in a plain browser tab,
    // so the dashboard degrades gracefully instead of crashing.
    window.api
      ?.getAppInfo()
      .then((info) => {
        if (!cancelled) setAppInfo(info)
      })
      .catch(() => {
        if (!cancelled) setAppInfo(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!window.api) {
      setStorage(UNAVAILABLE_STORAGE)
      return
    }

    async function refresh() {
      try {
        const info = await window.api.getStorageInfo()
        if (!cancelled) setStorage(info)
      } catch {
        if (!cancelled) setStorage(UNAVAILABLE_STORAGE)
      }
    }

    void refresh()
    const id = window.setInterval(refresh, STORAGE_REFRESH)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  // Theme and accent are CSS custom properties, so every surface follows them.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = app.settings.theme
    root.style.setProperty('--accent', app.settings.accent)
  }, [app.settings.theme, app.settings.accent])

  useEffect(() => {
    if (app.loading || startApplied.current) return
    startApplied.current = true
    setView(app.settings.startView)
  }, [app.loading, app.settings.startView])

  const notify = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current)
    setToast(message)
    timer.current = setTimeout(() => setToast(null), 3400)
  }, [])

  // Play-session notifications follow the games that start and stop.
  useEffect(() => {
    const running = app.runningIds
    const previous = previousRunning.current
    previousRunning.current = running

    if (!previous || !app.settings.notifySessions) return

    function titleOf(id: string) {
      return app.games.find((game) => game.id === id)?.title ?? 'Game'
    }

    for (const id of running) {
      if (!previous.includes(id)) notify(`Now playing ${titleOf(id)}`)
    }
    for (const id of previous) {
      if (!running.includes(id)) notify(`${titleOf(id)} closed.`)
    }
  }, [app.runningIds, app.games, app.settings.notifySessions, notify])

  const editing = app.games.find((game) => game.id === editingId) ?? null

  return (
    <div className="shell">
      <Sidebar view={view} onNavigate={setView} appInfo={appInfo} />
      <div className="stage">
        <TopBar profile={app.profile} />
        <div className="stage__body">
          {view === 'home' ? (
            <HomeScreen
              app={app}
              appInfo={appInfo}
              storage={storage}
              notify={notify}
              onEdit={setEditingId}
            />
          ) : view === 'library' ? (
            <LibraryScreen app={app} notify={notify} onEdit={setEditingId} />
          ) : view === 'trophies' ? (
            <TrophiesScreen app={app} notify={notify} />
          ) : (
            <SettingsScreen app={app} notify={notify} />
          )}
        </div>
      </div>

      {editing ? (
        <GameEditor
          key={editing.id}
          game={editing}
          app={app}
          notify={notify}
          onClose={() => setEditingId(null)}
        />
      ) : null}

      <Toast message={toast} />
    </div>
  )
}
