import type { Trophy, TrophyTier } from '@/types'

export interface TierDefinition {
  id: TrophyTier
  label: string
  color: string
}

export const TIERS: TierDefinition[] = [
  { id: 'bronze', label: 'Bronze', color: '#d2955f' },
  { id: 'silver', label: 'Silver', color: '#c9d3e0' },
  { id: 'gold', label: 'Gold', color: '#f2c65c' },
  { id: 'platinum', label: 'Platinum', color: '#8fd7ff' },
]

export function tierFor(tier: TrophyTier): TierDefinition {
  return TIERS.find((entry) => entry.id === tier) ?? TIERS[0]
}

export interface Completion {
  unlocked: number
  total: number
  percent: number
}

export function completionOf(trophies: Trophy[]): Completion {
  const unlocked = trophies.filter((trophy) => trophy.unlockedAt !== null).length
  const total = trophies.length

  return {
    unlocked,
    total,
    percent: total === 0 ? 0 : Math.round((unlocked / total) * 100),
  }
}

export function countByTier(trophies: Trophy[]) {
  return TIERS.map((tier) => ({
    ...tier,
    ...completionOf(trophies.filter((trophy) => trophy.tier === tier.id)),
  }))
}

export function recentUnlocks(trophies: Trophy[], limit = 4): Trophy[] {
  return trophies
    .filter((trophy) => trophy.unlockedAt !== null)
    .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))
    .slice(0, limit)
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function timeAgo(at: number): string {
  const elapsed = Date.now() - at
  const minutes = Math.floor(elapsed / MINUTE)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(elapsed / HOUR)
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`

  const days = Math.floor(elapsed / DAY)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 60) return 'last month'
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return 'over a year ago'
}
