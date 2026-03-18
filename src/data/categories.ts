import type { TagCategory } from '../types'

export const TAG_CATEGORIES: TagCategory[] = [
  { id: 'fps', label: 'FPS / Shooter', color: '#ef4444' },
  { id: 'action-adventure', label: 'Action-Adventure', color: '#f97316' },
  { id: 'rpg', label: 'RPG', color: '#eab308' },
  { id: 'strategy', label: 'Strategy / Sim', color: '#22c55e' },
  { id: 'platformer', label: 'Platformer', color: '#06b6d4' },
  { id: 'puzzle', label: 'Puzzle / Narrative', color: '#8b5cf6' },
  { id: 'fighting', label: 'Fighting / Sports', color: '#ec4899' },
  { id: 'survival-horror', label: 'Survival / Horror', color: '#64748b' },
  { id: 'sandbox', label: 'Sandbox / Open World', color: '#14b8a6' },
  { id: 'roguelike', label: 'Roguelike / Procedural', color: '#f59e0b' },
]

/** Tag id -> hex color lookup, derived once from TAG_CATEGORIES. */
export const TAG_COLORS: Record<string, string> = Object.fromEntries(
  TAG_CATEGORIES.map(c => [c.id, c.color])
)
