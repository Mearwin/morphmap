import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type GameFile, DATE_RE } from './lib/games.js'

export function buildGames(gamesDir: string): GameFile[] {
  const files = readdirSync(gamesDir).filter(f => f.endsWith('.json')).sort()
  const games: GameFile[] = []

  for (const file of files) {
    const filePath = join(gamesDir, file)
    let raw: string
    let game: GameFile

    try {
      raw = readFileSync(filePath, 'utf-8')
    } catch {
      throw new Error(`Failed to read ${file}`)
    }

    try {
      game = JSON.parse(raw) as GameFile
    } catch {
      throw new Error(`Invalid JSON in ${file}`)
    }

    if (typeof game.id !== 'string' || game.id === '') {
      throw new Error(`${file}: missing or empty "id"`)
    }
    if (typeof game.title !== 'string' || game.title === '') {
      throw new Error(`${file}: missing or empty "title"`)
    }
    if (typeof game.date !== 'string' || !DATE_RE.test(game.date)) {
      throw new Error(`${file}: invalid "date" (expected YYYY-MM-DD, got "${game.date}")`)
    }
    if (isNaN(new Date(game.date).getTime())) {
      throw new Error(`${file}: "date" does not parse to a valid date`)
    }
    if (!Array.isArray(game.tags) || game.tags.length === 0) {
      throw new Error(`${file}: "tags" must be a non-empty array`)
    }
    if (!Array.isArray(game.influencedBy)) {
      throw new Error(`${file}: "influencedBy" must be an array`)
    }

    games.push(game)
  }

  games.sort((a, b) => a.date.localeCompare(b.date))

  return games
}

// CLI entry point
const isMain = process.argv[1]?.endsWith('build-games.ts') || process.argv[1]?.endsWith('build-games.js')
if (isMain) {
  const gamesDir = join(import.meta.dirname, '..', 'src', 'data', 'games')
  const outPath = join(import.meta.dirname, '..', 'src', 'data', 'games.json')

  const games = buildGames(gamesDir)

  const allIds = new Set(games.map(g => g.id))
  const errors: string[] = []
  for (const game of games) {
    for (const inf of game.influencedBy) {
      if (!allIds.has(inf.id)) {
        errors.push(`${game.id}: influencedBy references unknown game "${inf.id}"`)
      }
      if (inf.id === game.id) {
        errors.push(`${game.id}: references itself in influencedBy`)
      }
      if (!Array.isArray(inf.through) || inf.through.length === 0) {
        errors.push(`${game.id}: influence from "${inf.id}" has empty through`)
      }
      const tagSet = new Set(game.tags)
      for (const t of inf.through) {
        if (!tagSet.has(t)) {
          errors.push(`${game.id}: through tag "${t}" (from ${inf.id}) not in own tags`)
        }
      }
    }
  }

  const seen = new Set<string>()
  for (const game of games) {
    if (seen.has(game.id)) {
      errors.push(`Duplicate ID: "${game.id}"`)
    }
    seen.add(game.id)
  }

  if (errors.length > 0) {
    console.error('Validation errors:')
    for (const e of errors) console.error(`  ✗ ${e}`)
    process.exit(1)
  }

  writeFileSync(outPath, JSON.stringify(games, null, 2) + '\n')
  console.log(`✓ Built ${games.length} games → src/data/games.json`)
}
