import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { FolderIcon } from '@/components/Icons'
import { Modal } from '@/components/Modal'
import type { AppController } from '@/hooks/useAppState'
import { artworkFor } from '@/data/artwork'
import { initialsFor } from '@/data/library'
import type { Game, LaunchPreview, WatchMode } from '@/types'
import './GameEditor.css'

const ACCENTS = ['#5aa9ff', '#ff8a5c', '#ff5aa8', '#ffa94d', '#7fe0a0', '#ffd166', '#4fd8ff', '#9b8cff']

const WATCH_OPTIONS: { id: WatchMode; label: string }[] = [
  { id: 'process', label: 'Until the game process closes' },
  { id: 'tree', label: 'Until the game and its child processes close' },
  { id: 'window', label: 'Until the game window closes' },
  { id: 'manual', label: 'Until I press Stop' },
]

const WATCH_LABELS = Object.fromEntries(
  WATCH_OPTIONS.map((option) => [option.id, option.label]),
) as Record<WatchMode, string>

interface GameEditorProps {
  game: Game
  app: AppController
  notify: (message: string) => void
  onClose: () => void
}

export function GameEditor({ game, app, notify, onClose }: GameEditorProps) {
  const [title, setTitle] = useState(game.title)
  const [genre, setGenre] = useState(game.genre)
  const [tagline, setTagline] = useState(game.tagline)
  const [entry, setEntry] = useState(game.launch.entry)
  const [cwd, setCwd] = useState(game.launch.cwd)
  const [runtime, setRuntime] = useState(game.launch.runtime)
  const [watch, setWatch] = useState<WatchMode>(game.launch.watch)
  const [argsText, setArgsText] = useState(game.launcherArgs)
  const [trusted, setTrusted] = useState(Boolean(game.launch.trustedAt))
  const [preview, setPreview] = useState<LaunchPreview | null>(null)
  const [accent, setAccent] = useState(game.accent)
  const [favorite, setFavorite] = useState(game.favorite)
  const [saving, setSaving] = useState(false)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  const { previewLaunch } = app

  // The preview is produced by the same planner a real launch uses, so the
  // command shown here is exactly the command that would run.
  useEffect(() => {
    if (!app.bridge) return

    let cancelled = false
    const timer = setTimeout(() => {
      void previewLaunch(game.id, { runtime, entry, cwd, argsText, watch })
        .then((next) => {
          if (!cancelled) setPreview(next)
        })
        .catch(() => undefined)
    }, 150)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [previewLaunch, app.bridge, game.id, runtime, entry, cwd, argsText, watch])

  const art = artworkFor(game)
  const hasArt = Boolean(art.cover) && failedSrc !== art.cover
  const needsTrust = preview ? preview.requiresTrust : game.requiresTrust
  const command = preview?.command ?? game.launchCommand
  const label = preview?.label ?? game.launchLabel
  const warning = preview?.warning ?? game.launchWarning

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || saving) return

    setSaving(true)
    try {
      await app.updateGame(game.id, {
        title: title.trim(),
        genre: genre.trim(),
        tagline: tagline.trim(),
        accent,
        favorite,
      })
      await app.updateLaunch(game.id, {
        runtime,
        entry,
        cwd,
        argsText,
        watch,
        trust: needsTrust ? trusted : undefined,
      })
      onClose()
    } catch {
      notify('That change could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function chooseTarget(kind: 'file' | 'folder') {
    const paths = await app.pickLaunchTarget(kind)
    if (paths.length === 0) return

    // Detection decides the entry, working folder and tracking for the choice.
    const found = await app.inspectPaths(paths)
    const candidate = found[0]

    if (!candidate || !candidate.entry) {
      setEntry(paths[0])
      setTrusted(false)
      return
    }

    setEntry(candidate.entry)
    setCwd(candidate.cwd)
    setRuntime(candidate.runtime)
    setWatch(candidate.watch)
    setTrusted(false)
  }

  async function chooseFolder() {
    const paths = await app.pickLaunchTarget('folder')
    const picked = paths[0]
    if (picked) setCwd(picked)
  }

  return (
    <Modal title="Edit game" onClose={onClose}>
      <form className="editor__form" onSubmit={save}>
        <label className="field">
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            autoFocus
          />
        </label>

        <label className="field">
          <span>Genre</span>
          <input
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            placeholder="Action RPG"
            maxLength={60}
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            rows={2}
            maxLength={400}
            placeholder="A short line shown on the home screen"
          />
        </label>

        <div className="field">
          <span>Entry point</span>
          <div className="editor__path editor__path--wrap">
            <input value={entry} readOnly placeholder="No file chosen" title={entry} />
            <button
              type="button"
              className="editor__button"
              onClick={() => void chooseTarget('file')}
            >
              <FolderIcon size={15} />
              Choose file
            </button>
            <button
              type="button"
              className="editor__button"
              onClick={() => void chooseTarget('folder')}
            >
              Choose folder
            </button>
          </div>
        </div>

        <div className="field">
          <span>Working folder</span>
          <div className="editor__path editor__path--wrap">
            <input value={cwd} readOnly placeholder="The game folder" title={cwd} />
            <button type="button" className="editor__button" onClick={() => void chooseFolder()}>
              <FolderIcon size={15} />
              Choose folder
            </button>
          </div>
        </div>

        <label className="field">
          <span>Arguments</span>
          <input
            value={argsText}
            onChange={(event) => setArgsText(event.target.value)}
            placeholder="-windowed"
            maxLength={500}
          />
        </label>

        <label className="field">
          <span>Session tracking</span>
          <select value={watch} onChange={(event) => setWatch(event.target.value as WatchMode)}>
            {WATCH_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>How it starts</span>
          <div className="editor__launch">
            <div className="editor__launchHead">
              <span className="editor__badge">{label}</span>
              <span className="editor__watch">{WATCH_LABELS[preview?.watch ?? watch]}</span>
            </div>
            <code className="editor__command" title={command}>
              {command || 'Nothing to run yet'}
            </code>
            {preview?.cwd ? <p className="editor__hint">Working folder: {preview.cwd}</p> : null}
            {warning ? <p className="editor__warning">{warning}</p> : null}
          </div>
        </div>

        {needsTrust ? (
          <label className="editor__toggle">
            <input
              type="checkbox"
              checked={trusted}
              onChange={(event) => setTrusted(event.target.checked)}
            />
            <span>I trust this game to run the command above</span>
          </label>
        ) : null}

        <div className="field">
          <span>Accent</span>
          <div className="swatches">
            {ACCENTS.map((option) => (
              <button
                key={option}
                type="button"
                className={`swatch${accent.toLowerCase() === option ? ' is-active' : ''}`}
                style={{ '--swatch': option } as CSSProperties}
                onClick={() => setAccent(option)}
                aria-label={`Accent ${option}`}
                aria-pressed={accent.toLowerCase() === option}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <span>Artwork</span>
          <div className="editor__art">
            <span className="editor__thumb">
              {hasArt ? (
                <img
                  src={art.cover ?? ''}
                  alt=""
                  draggable={false}
                  onError={() => setFailedSrc(art.cover)}
                />
              ) : (
                <span className="editor__thumbFallback">{initialsFor(title || game.title)}</span>
              )}
            </span>
            <div className="editor__artActions">
              <button
                type="button"
                className="editor__button"
                onClick={() => app.chooseArtwork(game.id)}
              >
                Choose image
              </button>
              <button
                type="button"
                className="editor__button"
                onClick={() => app.clearArtwork(game.id)}
              >
                Remove image
              </button>
            </div>
          </div>
        </div>

        <label className="editor__toggle">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(event) => setFavorite(event.target.checked)}
          />
          <span>Show in favourites</span>
        </label>

        <footer className="editor__footer">
          <button type="button" className="editor__button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary btn-primary--compact"
            disabled={!title.trim() || saving}
          >
            Save
          </button>
        </footer>
      </form>
    </Modal>
  )
}
