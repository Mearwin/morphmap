import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const GAMES_DIR = join(import.meta.dirname, '..', '..', 'src', 'data', 'games')
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface GameFile {
  id: string
  title: string
  date: string
  tags: string[]
  influencedBy: { id: string; through: string[] }[]
  imageUrl?: string
}

export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function loadAllGames(): GameFile[] {
  const files = readdirSync(GAMES_DIR).filter(f => f.endsWith('.json')).sort()
  return files.map(f => {
    const raw = readFileSync(join(GAMES_DIR, f), 'utf-8')
    return JSON.parse(raw) as GameFile
  })
}

export function loadGame(id: string): GameFile {
  const filePath = join(GAMES_DIR, `${id}.json`)
  const raw = readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as GameFile
}

export function saveGame(game: GameFile): void {
  const filePath = join(GAMES_DIR, `${game.id}.json`)
  writeFileSync(filePath, JSON.stringify(game, null, 2) + '\n')
}

export function getAllIds(): Set<string> {
  return new Set(
    readdirSync(GAMES_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
  )
}

export function gameExists(id: string): boolean {
  return getAllIds().has(id)
}

export function validateDate(date: string): boolean {
  return DATE_RE.test(date) && !isNaN(new Date(date).getTime())
}

export { GAMES_DIR, DATE_RE }
