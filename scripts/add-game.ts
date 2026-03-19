import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { searchGame, type WikidataGame } from './lib/wikidata.js'
import { mapGenres } from './lib/genre-map.js'

const GAMES_DIR = join(import.meta.dirname, '..', 'src', 'data', 'games')

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function main() {
  const title = process.argv[2]
  if (!title) {
    console.error('Usage: npm run data:add "<Game Title>"')
    process.exit(1)
  }

  console.log(`Searching Wikidata for "${title}"...`)
  const results = await searchGame(title)

  if (results.length === 0) {
    console.error(`No video game found on Wikidata for "${title}".`)
    console.error('You can create the file manually in src/data/games/')
    process.exit(1)
  }

  // Pick the best match: prefer exact title match, then first result
  let match: WikidataGame = results[0]
  const exact = results.find(r => r.title.toLowerCase() === title.toLowerCase())
  if (exact) match = exact

  // If multiple results, show them
  if (results.length > 1) {
    console.log(`\nFound ${results.length} results:`)
    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      const marker = r.qid === match.qid ? '→' : ' '
      console.log(`  ${marker} [${i}] ${r.title} (${r.date ?? 'no date'}) — ${r.qid}`)
    }
    console.log(`\nUsing: ${match.title} (${match.qid})`)
    console.log('To use a different result, pass the QID: npm run data:add "Title" -- --qid Q123456')
  }

  // Check for --qid override
  const qidFlag = process.argv.indexOf('--qid')
  if (qidFlag !== -1 && process.argv[qidFlag + 1]) {
    const overrideQid = process.argv[qidFlag + 1]
    const override = results.find(r => r.qid === overrideQid)
    if (override) {
      match = override
    } else {
      console.error(`QID ${overrideQid} not found in search results.`)
      process.exit(1)
    }
  }

  const id = toSlug(match.title)
  const filePath = join(GAMES_DIR, `${id}.json`)

  // Check if already exists
  if (existsSync(filePath)) {
    console.error(`\n✗ Game already exists: src/data/games/${id}.json`)
    process.exit(1)
  }

  // Map genres
  const { tags } = mapGenres(match.genres)

  const game = {
    id,
    title: match.title,
    date: match.date ?? '0000-01-01',
    tags,
    influencedBy: [] as { id: string; through: string[] }[],
  }

  writeFileSync(filePath, JSON.stringify(game, null, 2) + '\n')

  console.log(`\n✓ Created src/data/games/${id}.json`)
  console.log(`  Title:      ${game.title}`)
  console.log(`  Date:       ${game.date}`)
  console.log(`  Tags:       ${game.tags.join(', ')}`)
  console.log(`  Influences: (empty — fill in manually)`)

  if (match.date === null) {
    console.log(`\n⚠ No release date found on Wikidata — date set to "0000-01-01", please fix manually.`)
  }

  console.log(`\nNext steps:`)
  console.log(`  1. Review and edit src/data/games/${id}.json`)
  console.log(`  2. Add influencedBy relationships`)
  console.log(`  3. Run: npm run data:build`)
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
