export interface Influence {
  id: string
  through: string[]
}

/** Generic base type for any dataset entity (game, language, genre, etc.) */
export interface Entity {
  id: string
  title: string
  date: string
  tags: string[]
  primaryTag: string
  influencedBy: Influence[]
  [key: string]: unknown
}

export type TagCategory = {
  id: string
  label: string
  color: string
}

// Re-export from canonical data file so existing imports keep working
export { TAG_CATEGORIES, TAG_COLORS } from './data/categories'

/** Layout-positioned entity for rendering */
export interface EntityNode extends Entity {
  x: number
  y: number
  vx?: number
  vy?: number
  radius: number
}

export interface Game extends Entity {
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

