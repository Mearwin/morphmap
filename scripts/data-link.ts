import { loadGame, saveGame, gameExists, loadAllGames, type GameFile } from './lib/games.js'
import { parseFlags, getPositional, prompt, promptChoice, promptYesNo, closeRL } from './lib/args.js'

function findGame(games: GameFile[], id: string): GameFile | undefined {
  return games.find(g => g.id === id)
}

async function main() {
  const flags = parseFlags(process.argv)
  const targetId = getPositional(process.argv)

  if (!targetId) {
    console.error('Usage: npm run data:link <game-id> [--from <source-id> --through <tag1,tag2>]')
    process.exit(1)
  }

  if (!gameExists(targetId)) {
    console.error(`Game not found: ${targetId}`)
    process.exit(1)
  }

  const games = loadAllGames()
  const target = findGame(games, targetId)!

  // Show current influences
  console.log(`\nCurrent influences for ${target.title} (${target.date}):`)
  if (target.influencedBy.length === 0) {
    console.log('  (none)')
  } else {
    for (const inf of target.influencedBy) {
      const source = findGame(games, inf.id)
      console.log(`  ← ${source?.title ?? inf.id} through [${inf.through.join(', ')}]`)
    }
  }

  const fromFlag = flags.get('from')
  const throughFlag = flags.get('through')

  if (fromFlag && throughFlag) {
    // Non-interactive mode
    addInfluence(games, target, fromFlag, throughFlag.split(',').map(t => t.trim()))
    saveGame(target)
    console.log(`\n✓ Saved ${target.id}.json`)
  } else {
    // Interactive loop
    let adding = true
    while (adding) {
      const sourceId = fromFlag ?? await prompt('\nAdd influence from: ')
      if (!sourceId) break

      if (!gameExists(sourceId)) {
        console.error(`  ✗ Game not found: ${sourceId}`)
        if (fromFlag) process.exit(1)
        continue
      }

      let throughTags: string[]
      if (throughFlag) {
        throughTags = throughFlag.split(',').map(t => t.trim())
      } else {
        console.log(`\nThrough tags (from ${target.title}'s tags):`)
        const selected = await promptChoice('Select: ', target.tags)
        if (selected.length === 0) {
          console.error('  ✗ No tags selected.')
          continue
        }
        throughTags = selected.map(i => target.tags[i])
      }

      addInfluence(games, target, sourceId, throughTags)
      saveGame(target)

      const source = findGame(games, sourceId)
      console.log(`\n✓ Added: ${target.title} ← ${source?.title ?? sourceId} through [${throughTags.join(', ')}]`)

      if (fromFlag) break // non-interactive had --from, don't loop
      adding = await promptYesNo('Add another?')
    }
  }

  closeRL()
}

function addInfluence(games: GameFile[], target: GameFile, sourceId: string, throughTags: string[]) {
  const source = findGame(games, sourceId)
  if (!source) {
    console.error(`  ✗ Game not found: ${sourceId}`)
    process.exit(1)
  }

  // Validate source predates target
  if (source.date > target.date && source.date !== '0000-01-01' && target.date !== '0000-01-01') {
    console.error(`  ⚠ Warning: ${source.title} (${source.date}) was released after ${target.title} (${target.date})`)
  }

  // Check through-tags are in target's tags — add if missing
  const tagSet = new Set(target.tags)
  for (const t of throughTags) {
    if (!tagSet.has(t)) {
      target.tags.push(t)
      console.log(`  ⚠ Added missing tag "${t}" to ${target.id}`)
    }
  }

  // Check for duplicate influence
  const existing = target.influencedBy.find(inf => inf.id === sourceId)
  if (existing) {
    // Merge through-tags
    const existingSet = new Set(existing.through)
    for (const t of throughTags) {
      if (!existingSet.has(t)) existing.through.push(t)
    }
    console.log(`  Updated existing influence from ${sourceId}`)
  } else {
    target.influencedBy.push({ id: sourceId, through: throughTags })
  }
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
