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
  influencedBy: Influence[]
  [key: string]: unknown
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
