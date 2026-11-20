import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { AppController } from '@/hooks/useAppState'
import type { ThemeId } from '@/types'
import './SettingsScreen.css'

const THEMES: { id: ThemeId; name: string; preview: string }[] = [
  { id: 'midnight', name: 'Midnight', preview: 'linear-gradient(140deg, #0b1220, #5aa9ff)' },
  { id: 'aurora', name: 'Aurora', preview: 'linear-gradient(140deg, #120b24, #9b8cff)' },
  { id: 'ember', name: 'Ember', preview: 'linear-gradient(140deg, #1a0d0a, #ff8a5c)' },
]

const ACCENTS = [
  '#5aa9ff',
  '#9b8cff',
  '#4fe0c4',
  '#ff8a5c',
  '#ff5aa8',
  '#ffd166',
  '#7fe0a0',
  '#4fd8ff',
]

interface SettingsScreenProps {
  app: AppController
  notify: (message: string) => void
}

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div className="setting-row">
      <span className="setting-row__label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`switch${checked ? ' is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" />
      </button>
    </div>
  )
}

export function SettingsScreen({ app, notify }: SettingsScreenProps) {
  const { settings, profile } = app
  const [name, setName] = useState(profile.name)
  const [initials, setInitials] = useState(profile.initials)
  const [savingProfile, setSavingProfile] = useState(false)

  const profileDirty = name.trim() !== profile.name || initials !== profile.initials
  const canSaveProfile = Boolean(name.trim()) && profileDirty && !savingProfile

  async function saveProfile() {
    if (!canSaveProfile) return
    setSavingProfile(true)
    try {
      await app.updateProfile({ name: name.trim(), initials })
      notify('Profile updated.')
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <section className="settings">
      <header className="settings__head">
        <div>
          <h2 className="settings__title">Settings</h2>
          <p className="settings__subtitle">Tune the console to suit you.</p>
        </div>
      </header>

      <div className="settings__grid">
        <article className="setting-card">
          <h3>Appearance</h3>

          <div className="themes">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`theme${settings.theme === theme.id ? ' is-active' : ''}`}
                onClick={() => app.updateSettings({ theme: theme.id })}
                aria-pressed={settings.theme === theme.id}
              >
                <span className="theme__preview" style={{ background: theme.preview }} />
                <span className="theme__name">{theme.name}</span>
              </button>
            ))}
          </div>

          <div className="setting-block">
            <span className="setting-card__label">Accent colour</span>
            <div className="accents">
              {ACCENTS.map((accent) => (
                <button
                  key={accent}
                  type="button"
                  className={`accent${settings.accent.toLowerCase() === accent ? ' is-active' : ''}`}
                  style={{ '--swatch': accent } as CSSProperties}
                  onClick={() => app.updateSettings({ accent })}
                  aria-label={`Accent ${accent}`}
                  aria-pressed={settings.accent.toLowerCase() === accent}
                />
              ))}
              <label className="accent accent--custom" title="Pick any colour">
                <input
                  type="color"
                  value={settings.accent}
                  onChange={(event) => app.updateSettings({ accent: event.target.value })}
                  aria-label="Custom accent colour"
                />
              </label>
            </div>
          </div>
        </article>

        <article className="setting-card">
          <h3>Startup</h3>

          <div className="setting-row">
            <span className="setting-row__label">Open on</span>
            <div className="segmented">
              <button
                type="button"
                className={settings.startView === 'home' ? 'is-active' : ''}
                aria-pressed={settings.startView === 'home'}
                onClick={() => app.updateSettings({ startView: 'home' })}
              >
                Home
              </button>
              <button
                type="button"
                className={settings.startView === 'library' ? 'is-active' : ''}
                aria-pressed={settings.startView === 'library'}
                onClick={() => app.updateSettings({ startView: 'library' })}
              >
                Library
              </button>
            </div>
          </div>

          <Toggle
            label="Start in fullscreen"
            checked={settings.fullscreen}
            onChange={(fullscreen) => app.updateSettings({ fullscreen })}
          />
        </article>

        <article className="setting-card">
          <h3>Notifications</h3>

          <Toggle
            label="Trophy unlocks"
            checked={settings.notifyTrophies}
            onChange={(notifyTrophies) => app.updateSettings({ notifyTrophies })}
          />
          <Toggle
            label="Play sessions"
            checked={settings.notifySessions}
            onChange={(notifySessions) => app.updateSettings({ notifySessions })}
          />
        </article>

        <article className="setting-card">
          <h3>Profile</h3>

          <div className="profile-card__preview">
            <span className="profile-card__avatar">{initials || '?'}</span>
            <span className="profile-card__meta">
              <strong>{profile.name}</strong>
              <span>Level {profile.level}</span>
            </span>
          </div>

          <label className="field">
            <span>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
            />
          </label>

          <label className="field">
            <span>Initials</span>
            <input
              value={initials}
              onChange={(event) =>
                setInitials(
                  event.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2),
                )
              }
              maxLength={2}
              placeholder="AP"
            />
          </label>

          <button
            type="button"
            className="btn-primary btn-primary--compact settings__save"
            onClick={saveProfile}
            disabled={!canSaveProfile}
          >
            Save profile
          </button>
        </article>
      </div>
    </section>
  )
}
