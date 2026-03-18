export interface Influence {
  id: string
  through: string[]
}

export interface Game {
  id: string
  title: string
  date: string
  tags: string[]
  primaryTag: string
  influencedBy: Influence[]
  imageUrl?: string
}

export interface GameNode extends Game {
  x: number
  y: number
  vx?: number
  vy?: number
  radius: number
}

export interface Link {
  source: string
  target: string
  through: string[]
}

export type TagCategory = {
  id: string
  label: string
  color: string
}

// Re-export from canonical data file so existing imports keep working
export { TAG_CATEGORIES, TAG_COLORS } from './data/categories'
