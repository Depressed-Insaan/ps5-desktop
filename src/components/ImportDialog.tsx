import { useState } from 'react'
import { FolderIcon, PlusIcon } from '@/components/Icons'
import { Modal } from '@/components/Modal'
import type { AppController } from '@/hooks/useAppState'
import type { ImportCandidate } from '@/types'
import './ImportDialog.css'

interface ImportDialogProps {
  app: AppController
  notify: (message: string) => void
  onClose: () => void
}

/**
 * Import is a confirmation step, never a surprise: every entry point is shown
 * with the exact command it will run, and scripts cannot be imported trusted
 * unless the box is ticked.
 */
export function ImportDialog({ app, notify, onClose }: ImportDialogProps) {
  const [candidates, setCandidates] = useState<ImportCandidate[]>([])
  const [trusted, setTrusted] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function replaceCandidate(previous: ImportCandidate, next: ImportCandidate) {
    setCandidates((current) =>
      current.map((candidate) => (candidate.token === previous.token ? next : candidate)),
    )
  }

  async function inspect(paths: string[]) {
    if (paths.length === 0) return

    setBusy(true)
    setMessage(null)
    try {
      const found = await app.inspectPaths(paths)
      if (found.length === 0) {
        setMessage('Nothing could be read from that selection.')
        return
      }

      /*
       * One unambiguous executable keeps the old one-click import. Anything
       * that needs a decision — a folder with several entries, a script, an
       * item already in the library — stops at the sheet instead.
       */
      const only = found[0]
      if (
        found.length === 1 &&
        only.importable &&
        !only.requiresTrust &&
        !only.ambiguous &&
        !only.alreadyImported
      ) {
        const result = await app.importCandidates([{ token: only.token, trusted: false }])
        if (result.added > 0) {
          notify(`Added ${only.title} to your library.`)
          onClose()
        } else {
          setMessage('That game is already in your library.')
        }
        return
      }

      setCandidates((current) => {
        const seen = new Set(current.map((candidate) => candidate.source.toLowerCase()))
        return [...current, ...found.filter((item) => !seen.has(item.source.toLowerCase()))]
      })
      if (found.some((item) => !item.importable)) {
        setMessage('Some items cannot be started yet; they will be skipped.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function choose(kind: 'file' | 'folder') {
    const paths = await app.pickLaunchTarget(kind)
    await inspect(paths)
  }

  async function chooseEntry(candidate: ImportCandidate) {
    const paths = await app.pickLaunchTarget('file')
    if (paths.length === 0) return

    const found = await app.inspectPaths(paths)
    if (found.length === 0) return

    replaceCandidate(candidate, found[0])
    setTrusted((current) => current.filter((token) => token !== candidate.token))
  }

  function toggleTrust(token: string) {
    setTrusted((current) =>
      current.includes(token) ? current.filter((entry) => entry !== token) : [...current, token],
    )
  }

  async function confirm() {
    const selection = candidates
      .filter((candidate) => candidate.importable && !candidate.alreadyImported)
      .map((candidate) => ({ token: candidate.token, trusted: trusted.includes(candidate.token) }))

    if (selection.length === 0) {
      setMessage('Nothing new to import.')
      return
    }

    setBusy(true)
    try {
      const result = await app.importCandidates(selection)
      if (result.added === 0) {
        setMessage('Nothing new was added.')
        return
      }

      notify(
        result.added === 1
          ? 'Added 1 game to your library.'
          : `Added ${result.added} games to your library.`,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const pending = candidates.filter((candidate) => candidate.importable && !candidate.alreadyImported)

  return (
    <Modal title="Import games" onClose={onClose}>
      <div className="import">
        <div className="import__actions">
          <button
            type="button"
            className="editor__button"
            onClick={() => void choose('file')}
            disabled={busy || !app.bridge}
          >
            <PlusIcon size={15} />
            Choose files
          </button>
          <button
            type="button"
            className="editor__button"
            onClick={() => void choose('folder')}
            disabled={busy || !app.bridge}
          >
            <FolderIcon size={15} />
            Choose folder
          </button>
        </div>

        <p className="import__intro">
          Pick a program, a script, a shortcut or a whole game folder. Nothing runs until you press
          Play.
        </p>

        {candidates.length === 0 ? (
          <p className="import__empty">Nothing selected yet.</p>
        ) : (
          <ul className="import__list">
            {candidates.map((candidate) => {
              const alreadyHere = candidate.alreadyImported
              return (
                <li
                  key={candidate.token}
                  className={`import__item${alreadyHere ? ' is-muted' : ''}`}
                >
                  <div className="import__row">
                    <div className="import__meta">
                      <strong>{candidate.title}</strong>
                      <span>
                        {candidate.runtimeLabel}
                        {candidate.ambiguous ? ' · several entry points found' : ''}
                      </span>
                    </div>
                    <span className={`import__badge${candidate.importable ? '' : ' is-off'}`}>
                      {alreadyHere ? 'Already here' : candidate.importable ? 'Ready' : 'Skipped'}
                    </span>
                  </div>

                  <code className="import__command" title={candidate.command || candidate.source}>
                    {candidate.command || candidate.source}
                  </code>

                  {candidate.ambiguous && !alreadyHere ? (
                    <button
                      type="button"
                      className="import__link"
                      onClick={() => void chooseEntry(candidate)}
                    >
                      Choose the entry point…
                    </button>
                  ) : null}

                  {candidate.requiresTrust && !alreadyHere ? (
                    <label className="import__trust">
                      <input
                        type="checkbox"
                        checked={trusted.includes(candidate.token)}
                        onChange={() => toggleTrust(candidate.token)}
                      />
                      <span>
                        I trust this game. It will run the command shown above whenever I press
                        Play.
                      </span>
                    </label>
                  ) : null}

                  {candidate.notes.length > 0 ? (
                    <p className="import__notes">{candidate.notes.join(' ')}</p>
                  ) : null}

                  {candidate.warning ? (
                    <p className="import__warning">{candidate.warning}</p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}

        {message ? <p className="import__message">{message}</p> : null}

        <footer className="import__footer">
          <button type="button" className="editor__button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary btn-primary--compact"
            onClick={() => void confirm()}
            disabled={busy || pending.length === 0}
          >
            {pending.length > 1 ? `Add ${pending.length} games` : 'Add to library'}
          </button>
        </footer>
      </div>
    </Modal>
  )
}
