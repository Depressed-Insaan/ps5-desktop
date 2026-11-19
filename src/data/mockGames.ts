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

import type { Game, Profile } from '@/types'

/**
 * Phase 1 sample content. Everything here is placeholder data: the real
 * library will come from the main process in Phase 3, with the same shape.
 */
export const GAMES: Game[] = [
  {
    id: 'stellar-rift',
    title: 'Stellar Rift',
    tagline:
      'Chart a dying nebula, salvage what the stars left behind, and decide what the next galaxy remembers about you.',
    genre: 'Action RPG',
    cover: coverStellar,
    hero: heroStellar,
    accent: '#5aa9ff',
    lastPlayed: 'Played 2 hours ago',
    playtime: '48 h',
    installed: true,
    favorite: true,
  },
  {
    id: 'ironveil',
    title: 'Ironveil',
    tagline:
      'A masterless samurai walks a burning province, carrying a blade that remembers every oath it has broken.',
    genre: 'Action Adventure',
    cover: coverIronveil,
    hero: heroIronveil,
    accent: '#ff8a5c',
    lastPlayed: 'Played yesterday',
    playtime: '31 h',
    installed: true,
    favorite: true,
  },
  {
    id: 'velocity-nine',
    title: 'Velocity Nine',
    tagline:
      'Rain-slick streets, anti-gravity chassis and no speed limit. Nine districts, one perfect line.',
    genre: 'Racing',
    cover: coverVelocity,
    hero: heroVelocity,
    accent: '#ff5aa8',
    lastPlayed: 'Played 3 days ago',
    playtime: '22 h',
    installed: true,
    favorite: true,
  },
  {
    id: 'emberfall',
    title: 'Emberfall',
    tagline:
      'The last knight of a broken order climbs toward a dragon that has already won.',
    genre: 'Fantasy RPG',
    cover: coverEmberfall,
    accent: '#ffa94d',
    lastPlayed: 'Played last week',
    playtime: '76 h',
    installed: true,
    favorite: false,
  },
  {
    id: 'ashborne',
    title: 'Ashborne',
    tagline:
      'The city went quiet three winters ago. You are the first thing to walk its streets since.',
    genre: 'Survival Horror',
    cover: coverAshborne,
    accent: '#7fe0a0',
    lastPlayed: 'Played 2 weeks ago',
    playtime: '9 h',
    installed: true,
    favorite: false,
  },
  {
    id: 'crown-and-covenant',
    title: 'Crown & Covenant',
    tagline:
      'Every alliance has a price. Rule a fractured kingdom where loyalty is the rarest resource.',
    genre: 'Strategy',
    cover: coverCrown,
    accent: '#ffd166',
    lastPlayed: 'Played 3 weeks ago',
    playtime: '64 h',
    installed: true,
    favorite: true,
  },
  {
    id: 'gridline-26',
    title: 'Gridline 26',
    tagline:
      'Floodlights, ninety minutes, and a stadium that never forgets a missed chance.',
    genre: 'Sports',
    cover: coverGridline,
    accent: '#4fd8ff',
    lastPlayed: 'Played last month',
    playtime: '18 h',
    installed: false,
    favorite: false,
  },
]

export const profile: Profile = {
  name: 'Aarav Patel',
  initials: 'AP',
  level: 24,
}

export const continuePlaying = GAMES.slice(0, 5)
export const favourites = GAMES.filter((game) => game.favorite)
