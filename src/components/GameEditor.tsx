import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { CloseIcon, FolderIcon } from '@/components/Icons'
import type { LibraryController } from '@/hooks/useLibrary'
import { artworkFor } from '@/data/artwork'
import { initialsFor } from '@/data/library'
import type { Game } from '@/types'
import './GameEditor.css'

const ACCENTS = ['#5aa9ff', '#ff8a5c', '#ff5aa8', '#ffa94d', '#7fe0a0', '#ffd166', '#4fd8ff', '#9b8cff']

interface GameEditorProps {
  game: Game
  library: LibraryController
  notify: (message: string) => void
  onClose: () => void
}

export function GameEditor({ game, library, notify, onClose }: GameEditorProps) {
  const [title, setTitle] = useState(game.title)
  const [genre, setGenre] = useState(game.genre)
  const [tagline, setTagline] = useState(game.tagline)
  const [launcher, setLauncher] = useState(game.launcher)
  const [launcherArgs, setLauncherArgs] = useState(game.launcherArgs)
  const [accent, setAccent] = useState(game.accent)
  const [favorite, setFavorite] = useState(game.favorite)
  const [saving, setSaving] = useState(false)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  const art = artworkFor(game)
  const hasArt = Boolean(art.cover) && failedSrc !== art.cover

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    addEventListener('keydown', onKeyDown)
    return () => removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || saving) return

    setSaving(true)
    try {
      await library.updateGame(game.id, {
        title: title.trim(),
        genre: genre.trim(),
        tagline: tagline.trim(),
        accent,
        favorite,
        launcher,
        launcherArgs: launcherArgs.trim(),
      })
      onClose()
    } catch {
      notify('That change could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function chooseFile() {
    const picked = await library.pickExecutable()
    if (picked) setLauncher(picked)
  }

  async function chooseArtwork() {
    await library.chooseArtwork(game.id)
  }

  async function clearArtwork() {
    await library.clearArtwork(game.id)
  }

  return (
    <div
      className="editor"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="editor__panel" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header className="editor__head">
          <h2 className="editor__title" id="editor-title">
            Edit game
          </h2>
          <button type="button" className="editor__close" onClick={onClose} aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </header>

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
            <span>Launch target</span>
            <div className="editor__path">
              <input
                value={launcher}
                readOnly
                placeholder="No file chosen"
                title={launcher}
              />
              <button type="button" className="editor__button" onClick={chooseFile}>
                <FolderIcon size={15} />
                Choose file
              </button>
            </div>
          </div>

          <label className="field">
            <span>Arguments</span>
            <input
              value={launcherArgs}
              onChange={(event) => setLauncherArgs(event.target.value)}
              placeholder="-windowed"
              maxLength={500}
            />
          </label>

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
                <button type="button" className="editor__button" onClick={chooseArtwork}>
                  Choose image
                </button>
                <button type="button" className="editor__button" onClick={clearArtwork}>
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
            <button type="submit" className="btn-primary btn-primary--compact" disabled={!title.trim() || saving}>
              Save
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
