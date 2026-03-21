import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { searchGame, type WikidataGame } from './lib/wikidata.js'
import { mapGenres } from './lib/genre-map.js'
import { loadAllGames, saveGame, toSlug, GAMES_DIR, validateDate, type GameFile } from './lib/games.js'
import { parseFlags, getPositional, prompt, promptChoice, promptYesNo, closeRL } from './lib/args.js'
import { execSync } from 'node:child_process'

async function main() {
  const flags = parseFlags(process.argv)
  const positional = getPositional(process.argv)
  const skipWikidata = flags.has('skip-wikidata')

  let title: string | undefined
  let date: string | undefined
  let tags: string[] | undefined
  let id: string

  if (skipWikidata || flags.has('title')) {
    // Manual mode: use flags or prompt
    title = flags.get('title') ?? positional
    if (!title) title = await prompt('Title: ')
    if (!title) { console.error('Title is required.'); process.exit(1) }

    date = flags.get('date')
    if (!date) date = await prompt('Release date (YYYY-MM-DD): ')
    if (!validateDate(date)) { console.error(`Invalid date: "${date}"`); process.exit(1) }

    const tagsStr = flags.get('tags')
    if (tagsStr) {
      tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean)
    } else {
      const input = await prompt('Tags (comma-separated): ')
      tags = input.split(',').map(t => t.trim()).filter(Boolean)
    }
    if (tags.length === 0) { console.error('At least one tag is required.'); process.exit(1) }

    id = toSlug(title)
  } else {
    // Wikidata mode
    let searchTitle = positional
    if (!searchTitle) searchTitle = await prompt('Search title: ')
    if (!searchTitle) { console.error('Title is required.'); process.exit(1) }

    console.log(`Searching Wikidata for "${searchTitle}"...`)
    const results = await searchGame(searchTitle)

    if (results.length === 0) {
      console.error(`No video game found on Wikidata for "${searchTitle}".`)
      console.error('Use --skip-wikidata to add manually.')
      process.exit(1)
    }

    let match: WikidataGame

    if (results.length === 1) {
      match = results[0]
      console.log(`Found: ${match.title} (${match.date ?? 'no date'})`)
    } else {
      // Interactive selection
      console.log(`\nFound ${results.length} results:`)
      const best = results.find(r => r.title.toLowerCase() === searchTitle!.toLowerCase()) ?? results[0]
      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        const marker = r.qid === best.qid ? ' ← best match' : ''
        console.log(`  [${i}] ${r.title} (${r.date ?? 'no date'})${marker}`)
      }

      if (flags.has('qid')) {
        const override = results.find(r => r.qid === flags.get('qid'))
        if (!override) { console.error(`QID ${flags.get('qid')} not in results.`); process.exit(1) }
        match = override
      } else if (positional) {
        // Non-interactive: use best match
        match = best
        console.log(`Using: ${match.title}`)
      } else {
        // Interactive: ask user
        const bestIdx = results.indexOf(best)
        const answer = await prompt(`Use [${bestIdx}]? (y/n/number): `)
        if (answer === 'y' || answer === '') {
          match = best
        } else {
          const idx = parseInt(answer, 10)
          if (isNaN(idx) || idx < 0 || idx >= results.length) {
            console.error('Invalid selection.'); process.exit(1)
          }
          match = results[idx]
        }
      }
    }

    title = match.title
    date = match.date ?? '0000-01-01'
    const mapped = mapGenres(match.genres)
    tags = mapped.tags
    id = toSlug(title)

    if (match.date === null) {
      console.log(`\n⚠ No release date found on Wikidata — date set to "0000-01-01", please fix manually.`)
    }
  }

  // Check if already exists
  const filePath = join(GAMES_DIR, `${id}.json`)
  if (existsSync(filePath)) {
    console.error(`\n✗ Game already exists: src/data/games/${id}.json`)
    process.exit(1)
  }

  const game: GameFile = {
    id,
    title: title!,
    date: date!,
    tags: tags!,
    influencedBy: [],
  }

  saveGame(game)

  console.log(`\n✓ Created src/data/games/${id}.json`)
  console.log(`  Title:      ${game.title}`)
  console.log(`  Date:       ${game.date}`)
  console.log(`  Tags:       ${game.tags.join(', ')}`)
  console.log(`  Influences: (empty)`)

  // Offer to flow into link
  const hasStdin = !flags.has('skip-wikidata') && !positional
  if (hasStdin) {
    const addLinks = await promptYesNo('\nAdd influences now?')
    if (addLinks) {
      closeRL()
      execSync(`npx tsx ${join(import.meta.dirname, 'data-link.ts')} ${id}`, { stdio: 'inherit' })
      return
    }
  }

  closeRL()
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
