import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { searchGame, delay } from './lib/wikidata.js'

const GAMES_DIR = join(import.meta.dirname, '..', 'src', 'data', 'games')
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

interface GameFile {
  id: string
  title: string
  date: string
  tags: string[]
  influencedBy: { id: string; through: string[] }[]
}

function loadAllGames(): GameFile[] {
  const files = readdirSync(GAMES_DIR).filter(f => f.endsWith('.json')).sort()
  return files.map(f => {
    const raw = readFileSync(join(GAMES_DIR, f), 'utf-8')
    return JSON.parse(raw) as GameFile
  })
}

function validateStructural(games: GameFile[]): string[] {
  const errors: string[] = []
  const allIds = new Set<string>()

  for (const game of games) {
    // Duplicate IDs
    if (allIds.has(game.id)) {
      errors.push(`Duplicate ID: "${game.id}"`)
    }
    allIds.add(game.id)

    // Required fields
    if (!game.id || typeof game.id !== 'string') errors.push(`${game.id ?? '?'}: missing id`)
    if (!game.title || typeof game.title !== 'string') errors.push(`${game.id}: missing title`)
    if (!DATE_RE.test(game.date)) errors.push(`${game.id}: invalid date "${game.date}"`)
    if (!Array.isArray(game.tags) || game.tags.length === 0) errors.push(`${game.id}: empty tags`)

    // influencedBy checks
    for (const inf of game.influencedBy) {
      if (!allIds.has(inf.id) && !games.some(g => g.id === inf.id)) {
        errors.push(`${game.id}: influencedBy references unknown game "${inf.id}"`)
      }
      if (inf.id === game.id) {
        errors.push(`${game.id}: references itself`)
      }
      if (!Array.isArray(inf.through) || inf.through.length === 0) {
        errors.push(`${game.id}: influence from "${inf.id}" has empty through`)
      }
    }
  }

  // Mutual cycles (A→B and B→A)
  const influenceMap = new Map<string, Set<string>>()
  for (const g of games) {
    influenceMap.set(g.id, new Set(g.influencedBy.map(i => i.id)))
  }
  for (const g of games) {
    for (const inf of g.influencedBy) {
      if (influenceMap.get(inf.id)?.has(g.id) && g.id < inf.id) {
        errors.push(`Mutual influence: "${g.id}" <-> "${inf.id}"`)
      }
    }
  }

  return errors
}

async function validateOnline(games: GameFile[]): Promise<string[]> {
  const warnings: string[] = []
  const total = games.length
  let checked = 0

  for (const game of games) {
    checked++
    process.stdout.write(`\r  Checking ${checked}/${total}: ${game.title}...`)

    try {
      const results = await searchGame(game.title)
      const match = results.find(r => r.title.toLowerCase() === game.title.toLowerCase())

      if (!match) {
        warnings.push(`${game.id}: not found on Wikidata for title "${game.title}"`)
      } else {
        // Check date
        if (match.date && game.date !== '0000-01-01') {
          const ourDate = new Date(game.date).getTime()
          const wdDate = new Date(match.date).getTime()
          const diffDays = Math.abs(ourDate - wdDate) / (1000 * 60 * 60 * 24)
          if (diffDays > 30) {
            warnings.push(`${game.id}: date mismatch (ours: ${game.date}, Wikidata: ${match.date})`)
          }
        }

        // Check title
        if (match.title !== game.title) {
          warnings.push(`${game.id}: title mismatch (ours: "${game.title}", Wikidata: "${match.title}")`)
        }
      }
    } catch (err) {
      warnings.push(`${game.id}: Wikidata fetch failed — ${(err as Error).message}`)
    }

    await delay(100) // rate limit
  }

  process.stdout.write('\r' + ' '.repeat(60) + '\r')
  return warnings
}

async function main() {
  const online = process.argv.includes('--online')

  console.log('Loading games...')
  const games = loadAllGames()
  console.log(`Found ${games.length} games\n`)

  // Structural validation
  console.log('Structural validation...')
  const errors = validateStructural(games)
  if (errors.length > 0) {
    console.log(`\n✗ ${errors.length} error(s):`)
    for (const e of errors) console.log(`  ✗ ${e}`)
  } else {
    console.log(`✓ All ${games.length} games pass structural validation`)
  }

  // Online validation
  if (online) {
    console.log('\nOnline validation (Wikidata)...')
    const warnings = await validateOnline(games)
    if (warnings.length > 0) {
      console.log(`\n⚠ ${warnings.length} warning(s):`)
      for (const w of warnings) console.log(`  ⚠ ${w}`)
    } else {
      console.log(`✓ All ${games.length} games match Wikidata`)
    }
  }

  // Exit code
  if (errors.length > 0) process.exit(1)
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
