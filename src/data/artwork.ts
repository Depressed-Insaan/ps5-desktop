import coverStellar from '@/assets/artwork/cover-stellar.jpg'
import coverIronveil from '@/assets/artwork/cover-ironveil.jpg'
import coverVelocity from '@/assets/artwork/cover-velocity.jpg'
import coverEmberfall from '@/assets/artwork/cover-emberfall.jpg'
import coverAshborne from '@/assets/artwork/cover-ashborne.jpg'
import coverCrown from '@/assets/artwork/cover-crown.jpg'
import coverGridline from '@/assets/artwork/cover-gridline.jpg'
import heroStellar from '@/assets/artwork/hero-stellar.jpg'
import heroIronveil from '@/assets/artwork/hero-ironveil.jpg'
import heroVelocity from '@/assets/artwork/hero-velocity.jpg'
import type { Game } from '@/types'

/**
 * Artwork bundled with the app, keyed by the id the library store seeds. User
 * artwork arrives separately as an app-media URL, so nothing here is written
 * to disk.
 */
interface BundledArtwork {
  cover: string
  hero?: string
}

const BUNDLED: Record<string, BundledArtwork> = {
  'stellar-rift': { cover: coverStellar, hero: heroStellar },
  ironveil: { cover: coverIronveil, hero: heroIronveil },
  'velocity-nine': { cover: coverVelocity, hero: heroVelocity },
  emberfall: { cover: coverEmberfall },
  ashborne: { cover: coverAshborne },
  'crown-and-covenant': { cover: coverCrown },
  'gridline-26': { cover: coverGridline },
}

export interface GameArtwork {
  cover: string | null
  hero: string | null
  /** True when the wide backdrop is a cover image that needs softening. */
  soft: boolean
}

export function artworkFor(game: Game): GameArtwork {
  const bundled = game.artworkKey ? BUNDLED[game.artworkKey] : undefined
  const cover = game.artworkUrl ?? bundled?.cover ?? null
  const hero = game.artworkUrl ?? bundled?.hero ?? cover

  return { cover, hero, soft: Boolean(cover) && !bundled?.hero }
}
