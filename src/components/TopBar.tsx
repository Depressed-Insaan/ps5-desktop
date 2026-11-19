import { useEffect, useState } from 'react'
import { SearchIcon } from '@/components/Icons'
import { profile } from '@/data/mockGames'
import './TopBar.css'

function greetingFor(hour: number) {
  if (hour < 5) return 'Late night session'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function TopBar() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20_000)
    return () => window.clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <header className="topbar">
      <div className="topbar__intro">
        <p className="topbar__eyebrow">
          {greetingFor(now.getHours())}, {profile.name.split(' ')[0]}
        </p>
        <h1 className="topbar__title">Your console</h1>
      </div>

      <div className="topbar__actions">
        <button
          type="button"
          className="topbar__icon"
          aria-label="Search library"
          title="Search"
        >
          <SearchIcon size={18} />
        </button>

        <div className="topbar__clock">
          <span>{time}</span>
          <small>{date}</small>
        </div>

        <div className="topbar__avatar" title={`${profile.name} · Level ${profile.level}`}>
          {profile.initials}
        </div>
      </div>
    </header>
  )
}
