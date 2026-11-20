/**
 * The library that ships with a fresh install so the console is not empty on
 * first launch. These entries carry bundled artwork but no launch target; the
 * user can point each one at an executable or remove it.
 */
export interface SeedGame {
  id: string
  title: string
  tagline: string
  genre: string
  accent: string
  favorite: boolean
  artworkKey: string
  playtimeHours: number
  /** Hours before first launch, used to make "last played" read naturally. */
  playedAgoHours: number
}

export const SEED_GAMES: SeedGame[] = [
  {
    id: 'stellar-rift',
    title: 'Stellar Rift',
    tagline:
      'Chart a dying nebula, salvage what the stars left behind, and decide what the next galaxy remembers about you.',
    genre: 'Action RPG',
    accent: '#5aa9ff',
    favorite: true,
    artworkKey: 'stellar-rift',
    playtimeHours: 48,
    playedAgoHours: 2,
  },
  {
    id: 'ironveil',
    title: 'Ironveil',
    tagline:
      'A masterless samurai walks a burning province, carrying a blade that remembers every oath it has broken.',
    genre: 'Action Adventure',
    accent: '#ff8a5c',
    favorite: true,
    artworkKey: 'ironveil',
    playtimeHours: 31,
    playedAgoHours: 26,
  },
  {
    id: 'velocity-nine',
    title: 'Velocity Nine',
    tagline:
      'Rain-slick streets, anti-gravity chassis and no speed limit. Nine districts, one perfect line.',
    genre: 'Racing',
    accent: '#ff5aa8',
    favorite: true,
    artworkKey: 'velocity-nine',
    playtimeHours: 22,
    playedAgoHours: 72,
  },
  {
    id: 'emberfall',
    title: 'Emberfall',
    tagline: 'The last knight of a broken order climbs toward a dragon that has already won.',
    genre: 'Fantasy RPG',
    accent: '#ffa94d',
    favorite: false,
    artworkKey: 'emberfall',
    playtimeHours: 76,
    playedAgoHours: 168,
  },
  {
    id: 'ashborne',
    title: 'Ashborne',
    tagline: 'The city went quiet three winters ago. You are the first thing to walk its streets since.',
    genre: 'Survival Horror',
    accent: '#7fe0a0',
    favorite: false,
    artworkKey: 'ashborne',
    playtimeHours: 9,
    playedAgoHours: 336,
  },
  {
    id: 'crown-and-covenant',
    title: 'Crown & Covenant',
    tagline: 'Every alliance has a price. Rule a fractured kingdom where loyalty is the rarest resource.',
    genre: 'Strategy',
    accent: '#ffd166',
    favorite: true,
    artworkKey: 'crown-and-covenant',
    playtimeHours: 64,
    playedAgoHours: 504,
  },
  {
    id: 'gridline-26',
    title: 'Gridline 26',
    tagline: 'Floodlights, ninety minutes, and a stadium that never forgets a missed chance.',
    genre: 'Sports',
    accent: '#4fd8ff',
    favorite: false,
    artworkKey: 'gridline-26',
    playtimeHours: 18,
    playedAgoHours: 840,
  },
]
