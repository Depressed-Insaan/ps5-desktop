import { useState } from 'react'
import type { CSSProperties } from 'react'
import { PencilIcon, PlusIcon, TrashIcon, TrophyIcon } from '@/components/Icons'
import { TrophyEditor } from '@/components/TrophyEditor'
import type { TrophyDraft } from '@/components/TrophyEditor'
import { artworkFor } from '@/data/artwork'
import { initialsFor } from '@/data/library'
import { TIERS, completionOf, countByTier, recentUnlocks, tierFor, timeAgo } from '@/data/trophies'
import type { AppController } from '@/hooks/useAppState'
import type { Trophy } from '@/types'
import './TrophiesScreen.css'

interface TrophiesScreenProps {
  app: AppController
  notify: (message: string) => void
}

const TIER_ORDER = new Map(TIERS.map((tier, index) => [tier.id, index]))

export function TrophiesScreen({ app, notify }: TrophiesScreenProps) {
  const { games, trophies } = app
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTrophy, setEditingTrophy] = useState<Trophy | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const selectedGame =
    games.find((game) => game.id === selectedGameId) ??
    games.find((game) => trophies.some((trophy) => trophy.gameId === game.id)) ??
    games[0] ??
    null

  const gameTrophies = selectedGame
    ? trophies.filter((trophy) => trophy.gameId === selectedGame.id)
    : []

  const sorted = [...gameTrophies].sort(
    (a, b) => (TIER_ORDER.get(a.tier) ?? 0) - (TIER_ORDER.get(b.tier) ?? 0),
  )

  const overall = completionOf(trophies)
  const counts = countByTier(trophies)
  const relativelyRecent = recentUnlocks(trophies, 4)
  const setStats = completionOf(gameTrophies)

  function openNewTrophy() {
    setEditingTrophy(null)
    setEditorOpen(true)
  }

  function openTrophy(trophy: Trophy) {
    setEditingTrophy(trophy)
    setEditorOpen(true)
  }

  async function saveTrophy(draft: TrophyDraft) {
    if (editingTrophy) {
      await app.updateTrophy(editingTrophy.id, draft)
      notify('Trophy updated.')
      return
    }
    if (!selectedGame) return
    await app.addTrophy({ ...draft, gameId: selectedGame.id })
    notify('Trophy added.')
  }

  async function advance(trophy: Trophy) {
    const next = await app.updateTrophy(trophy.id, { progress: trophy.progress + 1 })
    const updated = next?.trophies.find((entry) => entry.id === trophy.id)
    if (updated?.unlockedAt && !trophy.unlockedAt && app.settings.notifyTrophies) {
      notify(`Trophy unlocked — ${updated.title}`)
    }
  }

  async function unlock(trophy: Trophy) {
    await app.unlockTrophy(trophy.id)
    if (app.settings.notifyTrophies) notify(`Trophy unlocked — ${trophy.title}`)
  }

  async function remove(trophy: Trophy) {
    await app.removeTrophy(trophy.id)
    setConfirmingId(null)
    notify(`${trophy.title} was removed.`)
  }

  if (games.length === 0) {
    return (
      <section className="trophies">
        <div className="trophies__empty">
          <h2>Trophy collection</h2>
          <p>Trophies belong to a game. Import a game first, then add trophies to it.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="trophies">
      <header className="trophies__head">
        <div>
          <h2 className="trophies__title">Trophy collection</h2>
          <p className="trophies__count">
            {overall.unlocked} of {overall.total} unlocked · {overall.percent}%
          </p>
        </div>
      </header>

      <div className="tier-summary">
        {counts.map((tier) => (
          <article
            key={tier.id}
            className="tier-card"
            style={{ '--tier': tier.color } as CSSProperties}
          >
            <span className="tier-card__icon">
              <TrophyIcon size={18} />
            </span>
            <div className="tier-card__text">
              <strong>
                {tier.unlocked}
                <small> / {tier.total}</small>
              </strong>
              <span>{tier.label}</span>
            </div>
          </article>
        ))}
      </div>

      {relativelyRecent.length > 0 ? (
        <section className="recent">
          <h3 className="section-label">Recently unlocked</h3>
          <ul className="recent__list">
            {relativelyRecent.map((trophy) => {
              const tier = tierFor(trophy.tier)
              const game = games.find((entry) => entry.id === trophy.gameId)
              return (
                <li
                  key={trophy.id}
                  className="recent__item"
                  style={{ '--tier': tier.color } as CSSProperties}
                >
                  <span className="recent__icon">
                    <TrophyIcon size={14} />
                  </span>
                  <span className="recent__text">
                    <span className="recent__name">{trophy.title}</span>
                    <span className="recent__game">{game?.title ?? 'Unknown game'}</span>
                  </span>
                  <span className="recent__when">{timeAgo(trophy.unlockedAt ?? 0)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <div className="trophies__body">
        <aside className="trophy-games" aria-label="Games">
          <h3 className="section-label">Games</h3>
          <ul className="trophy-games__list">
            {games.map((game) => {
              const art = artworkFor(game)
              const stats = completionOf(trophies.filter((trophy) => trophy.gameId === game.id))
              return (
                <li key={game.id}>
                  <button
                    type="button"
                    className={`trophy-game${game.id === selectedGame?.id ? ' is-active' : ''}`}
                    onClick={() => setSelectedGameId(game.id)}
                    aria-pressed={game.id === selectedGame?.id}
                  >
                    <span className="trophy-game__art">
                      {art.cover ? (
                        <img src={art.cover} alt="" loading="lazy" draggable={false} />
                      ) : (
                        <span className="trophy-game__fallback">
                          {initialsFor(game.title)}
                        </span>
                      )}
                    </span>
                    <span className="trophy-game__info">
                      <span className="trophy-game__name">{game.title}</span>
                      <span className="trophy-game__meta">
                        {stats.unlocked} / {stats.total} trophies
                      </span>
                      <span className="progress">
                        <span
                          className="progress__fill"
                          style={{ width: `${stats.percent}%` }}
                        />
                      </span>
                    </span>
                    <span className="trophy-game__percent">{stats.percent}%</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <section className="trophy-set">
          <header className="trophy-set__head">
            <div>
              <h3 className="trophy-set__game">{selectedGame?.title ?? 'Trophies'}</h3>
              <p className="trophy-set__meta">
                {setStats.unlocked} of {setStats.total} unlocked · {setStats.percent}%
              </p>
            </div>
            <button
              type="button"
              className="btn-primary btn-primary--compact"
              onClick={openNewTrophy}
              disabled={!selectedGame}
            >
              <PlusIcon size={16} />
              Add trophy
            </button>
          </header>

          {sorted.length === 0 ? (
            <p className="trophy-set__empty">
              No trophies for this game yet. Add the first one to start tracking it.
            </p>
          ) : (
            <ul className="trophy-list">
              {sorted.map((trophy) => {
                const tier = tierFor(trophy.tier)
                const unlocked = trophy.unlockedAt !== null
                const percent = Math.min(
                  100,
                  Math.round((trophy.progress / trophy.target) * 100),
                )

                return (
                  <li
                    key={trophy.id}
                    className={`trophy${unlocked ? ' is-unlocked' : ''}`}
                    style={{ '--tier': tier.color } as CSSProperties}
                  >
                    <span className="trophy__badge">
                      <TrophyIcon size={16} />
                    </span>

                    <div className="trophy__main">
                      <div className="trophy__head">
                        <span className="trophy__tier">{tier.label}</span>
                        <h4 className="trophy__title">{trophy.title}</h4>
                      </div>
                      {trophy.description ? (
                        <p className="trophy__desc">{trophy.description}</p>
                      ) : null}
                      {trophy.target > 1 ? (
                        <div className="trophy__progress">
                          <span className="progress">
                            <span
                              className="progress__fill"
                              style={{ width: `${percent}%` }}
                            />
                          </span>
                          <span className="trophy__count">
                            {trophy.progress} / {trophy.target}
                          </span>
                        </div>
                      ) : null}
                      <span className={`trophy__state${unlocked ? ' is-unlocked' : ''}`}>
                        {unlocked
                          ? `Unlocked ${timeAgo(trophy.unlockedAt ?? 0)}`
                          : 'Locked'}
                      </span>
                    </div>

                    <div className="trophy__actions">
                      {!unlocked && trophy.target > 1 ? (
                        <button
                          type="button"
                          className="trophy__action"
                          onClick={() => advance(trophy)}
                          disabled={trophy.progress >= trophy.target}
                        >
                          +1
                        </button>
                      ) : null}

                      {!unlocked ? (
                        <button
                          type="button"
                          className="trophy__action is-accent"
                          onClick={() => unlock(trophy)}
                        >
                          Unlock
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="trophy__action is-icon"
                        onClick={() => openTrophy(trophy)}
                        aria-label={`Edit ${trophy.title}`}
                        title="Edit"
                      >
                        <PencilIcon size={14} />
                      </button>

                      {confirmingId === trophy.id ? (
                        <>
                          <button
                            type="button"
                            className="trophy__action is-danger"
                            onClick={() => remove(trophy)}
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            className="trophy__action"
                            onClick={() => setConfirmingId(null)}
                          >
                            Keep
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="trophy__action is-icon"
                          onClick={() => setConfirmingId(trophy.id)}
                          aria-label={`Remove ${trophy.title}`}
                          title="Remove"
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {editorOpen && selectedGame ? (
        <TrophyEditor
          trophy={editingTrophy}
          onSave={saveTrophy}
          onClose={() => {
            setEditorOpen(false)
            setEditingTrophy(null)
          }}
        />
      ) : null}
    </section>
  )
}
