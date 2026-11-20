import { useCallback, useEffect, useRef, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { Toast } from '@/components/Toast'
import { GameEditor } from '@/components/GameEditor'
import { HomeScreen } from '@/screens/HomeScreen'
import { LibraryScreen } from '@/screens/LibraryScreen'
import { PlaceholderScreen } from '@/screens/PlaceholderScreen'
import { useLibrary } from '@/hooks/useLibrary'
import type { AppInfo, ViewId } from '@/types'
import './App.css'

export default function App() {
  const [view, setView] = useState<ViewId>('home')
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const library = useLibrary()

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
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const notify = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current)
    setToast(message)
    timer.current = setTimeout(() => setToast(null), 3400)
  }, [])

  const editing = library.games.find((game) => game.id === editingId) ?? null

  return (
    <div className="shell">
      <Sidebar view={view} onNavigate={setView} appInfo={appInfo} />
      <div className="stage">
        <TopBar />
        <div className="stage__body">
          {view === 'home' ? (
            <HomeScreen
              library={library}
              appInfo={appInfo}
              notify={notify}
              onEdit={setEditingId}
            />
          ) : view === 'library' ? (
            <LibraryScreen library={library} notify={notify} onEdit={setEditingId} />
          ) : (
            <PlaceholderScreen view={view} />
          )}
        </div>
      </div>

      {editing ? (
        <GameEditor
          key={editing.id}
          game={editing}
          library={library}
          notify={notify}
          onClose={() => setEditingId(null)}
        />
      ) : null}

      <Toast message={toast} />
    </div>
  )
}
