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

/** A small trophy set so a fresh install has something to show. */
export interface SeedTrophy {
  id: string
  gameId: string
  title: string
  description: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  target: number
  progress: number
  unlockedDaysAgo: number | null
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

export const SEED_TROPHIES: SeedTrophy[] = [
  {
    id: 'stellar-first-light',
    gameId: 'stellar-rift',
    title: 'First Light',
    description: 'Leave the orbital docks and set a course for the nebula.',
    tier: 'bronze',
    target: 1,
    progress: 1,
    unlockedDaysAgo: 20,
  },
  {
    id: 'stellar-cartographer',
    gameId: 'stellar-rift',
    title: 'Nebula Cartographer',
    description: 'Chart twelve uncharted systems.',
    tier: 'silver',
    target: 12,
    progress: 7,
    unlockedDaysAgo: null,
  },
  {
    id: 'stellar-riftwalker',
    gameId: 'stellar-rift',
    title: 'Riftwalker',
    description: 'Survive twenty-five jumps through the rift.',
    tier: 'gold',
    target: 25,
    progress: 25,
    unlockedDaysAgo: 7,
  },
  {
    id: 'stellar-master',
    gameId: 'stellar-rift',
    title: 'Stellar Rift Master',
    description: 'Earn every other trophy in Stellar Rift.',
    tier: 'platinum',
    target: 1,
    progress: 0,
    unlockedDaysAgo: null,
  },
  {
    id: 'ironveil-first-blood',
    gameId: 'ironveil',
    title: 'First Blood',
    description: 'Win your first duel on the burning road.',
    tier: 'bronze',
    target: 1,
    progress: 1,
    unlockedDaysAgo: 30,
  },
  {
    id: 'ironveil-oathbreaker',
    gameId: 'ironveil',
    title: 'Oathbreaker',
    description: 'Break eight sworn oaths.',
    tier: 'silver',
    target: 8,
    progress: 3,
    unlockedDaysAgo: null,
  },
  {
    id: 'velocity-perfect-line',
    gameId: 'velocity-nine',
    title: 'Perfect Line',
    description: 'Win all nine district races without a crash.',
    tier: 'gold',
    target: 9,
    progress: 9,
    unlockedDaysAgo: 4,
  },
  {
    id: 'velocity-nine-districts',
    gameId: 'velocity-nine',
    title: 'Nine Districts',
    description: 'Earn every other trophy in Velocity Nine.',
    tier: 'platinum',
    target: 1,
    progress: 0,
    unlockedDaysAgo: null,
  },
  {
    id: 'emberfall-dragonfall',
    gameId: 'emberfall',
    title: 'Dragonfall',
    description: 'End the dragon that already won.',
    tier: 'gold',
    target: 1,
    progress: 1,
    unlockedDaysAgo: 10,
  },
  {
    id: 'crown-iron-crown',
    gameId: 'crown-and-covenant',
    title: 'Iron Crown',
    description: 'Hold five alliances through a single winter.',
    tier: 'silver',
    target: 5,
    progress: 2,
    unlockedDaysAgo: null,
  },
]
