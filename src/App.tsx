import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { HomeScreen } from '@/screens/HomeScreen'
import { PlaceholderScreen } from '@/screens/PlaceholderScreen'
import type { AppInfo, ViewId } from '@/types'
import './App.css'

export default function App() {
  const [view, setView] = useState<ViewId>('home')
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)

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

  return (
    <div className="shell">
      <Sidebar view={view} onNavigate={setView} appInfo={appInfo} />
      <div className="stage">
        <TopBar />
        <div className="stage__body">
          {view === 'home' ? <HomeScreen appInfo={appInfo} /> : <PlaceholderScreen view={view} />}
        </div>
      </div>
    </div>
  )
}
