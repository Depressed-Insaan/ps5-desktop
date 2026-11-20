import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { TIERS } from '@/data/trophies'
import type { Trophy, TrophyTier } from '@/types'
import './TrophyEditor.css'

export interface TrophyDraft {
  title: string
  description: string
  tier: TrophyTier
  target: number
}

interface TrophyEditorProps {
  trophy: Trophy | null
  onSave: (draft: TrophyDraft) => Promise<void>
  onClose: () => void
}

export function TrophyEditor({ trophy, onSave, onClose }: TrophyEditorProps) {
  const [title, setTitle] = useState(trophy?.title ?? '')
  const [description, setDescription] = useState(trophy?.description ?? '')
  const [tier, setTier] = useState<TrophyTier>(trophy?.tier ?? 'bronze')
  const [target, setTarget] = useState(String(trophy?.target ?? 1))
  const [saving, setSaving] = useState(false)

  const targetValue = Math.max(1, Math.min(999, Math.round(Number(target) || 1)))

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || saving) return

    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        tier,
        target: targetValue,
      })
      onClose()
    } catch {
      setSaving(false)
    }
  }

  return (
    <Modal title={trophy ? 'Edit trophy' : 'New trophy'} onClose={onClose}>
      <form className="trophy-form" onSubmit={save}>
        <label className="field">
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="First Light"
            maxLength={120}
            autoFocus
          />
        </label>

        <label className="field">
          <span>Requirement</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            maxLength={400}
            placeholder="What the player has to do"
          />
        </label>

        <div className="field">
          <span>Tier</span>
          <div className="trophy-tiers">
            {TIERS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`trophy-tier${tier === option.id ? ' is-active' : ''}`}
                style={{ '--tier': option.color } as CSSProperties}
                onClick={() => setTier(option.id)}
                aria-pressed={tier === option.id}
              >
                <span className="trophy-tier__dot" aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Progress target</span>
          <input
            type="number"
            min={1}
            max={999}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
          <small className="trophy-form__hint">
            Leave at 1 for a single-step trophy, or set a count to track progress.
          </small>
        </label>

        <footer className="trophy-form__footer">
          <button type="button" className="editor__button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary btn-primary--compact"
            disabled={!title.trim() || saving}
          >
            {trophy ? 'Save' : 'Add trophy'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
