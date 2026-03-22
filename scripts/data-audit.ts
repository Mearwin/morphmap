import { readdirSync } from 'node:fs'
import { loadAllGames, GAMES_DIR } from './lib/games.js'

function main() {
  const games = loadAllGames()
  let totalIssues = 0

  // Build reverse map: who does each game influence?
  const influencesMap = new Map<string, Set<string>>()
  for (const g of games) {
    for (const inf of g.influencedBy) {
      if (!influencesMap.has(inf.id)) influencesMap.set(inf.id, new Set())
      influencesMap.get(inf.id)!.add(g.id)
    }
  }

  // Orphans: no connections at all
  const orphans = games.filter(g =>
    g.influencedBy.length === 0 && !influencesMap.has(g.id)
  )
  if (orphans.length > 0) {
    console.log(`\nOrphans (${orphans.length}): no connections at all`)
    for (const g of orphans) console.log(`  - ${g.id} (${g.title}, ${g.date})`)
    totalIssues += orphans.length
  }

  // Roots: no influences but influence others (expected, informational)
  const roots = games.filter(g =>
    g.influencedBy.length === 0 && influencesMap.has(g.id)
  )
  if (roots.length > 0) {
    console.log(`\nRoots (${roots.length}): no influences, but influence others`)
    for (const g of roots) {
      const count = influencesMap.get(g.id)!.size
      console.log(`  - ${g.id} (${g.title}, ${g.date}) → influences ${count} game(s)`)
    }
  }

  // Dead ends: pre-2015 games that influence nobody (review candidates)
  const deadEnds = games.filter(g =>
    g.date < '2015-01-01' && g.date !== '0000-01-01' &&
    !influencesMap.has(g.id) &&
    g.influencedBy.length > 0
  )
  if (deadEnds.length > 0) {
    console.log(`\nDead ends (${deadEnds.length}): pre-2015, have influences but influence nobody`)
    for (const g of deadEnds) console.log(`  - ${g.id} (${g.title}, ${g.date})`)
    totalIssues += deadEnds.length
  }

  // Date violations: influenced by a later game
  const dateViolations: string[] = []
  const gameMap = new Map(games.map(g => [g.id, g]))
  for (const g of games) {
    if (g.date === '0000-01-01') continue
    for (const inf of g.influencedBy) {
      const source = gameMap.get(inf.id)
      if (!source || source.date === '0000-01-01') continue
      if (source.date > g.date) {
        dateViolations.push(`${g.id} (${g.date}) ← ${source.id} (${source.date})`)
      }
    }
  }
  if (dateViolations.length > 0) {
    console.log(`\nDate violations (${dateViolations.length}): influenced by a later game`)
    for (const v of dateViolations) console.log(`  ✗ ${v}`)
    totalIssues += dateViolations.length
  }

  // Tag consistency: through-tags not in game tags
  const tagIssues: string[] = []
  for (const g of games) {
    const tagSet = new Set(g.tags)
    for (const inf of g.influencedBy) {
      for (const t of inf.through) {
        if (!tagSet.has(t)) {
          tagIssues.push(`${g.id}: through tag "${t}" (from ${inf.id}) not in own tags`)
        }
      }
    }
  }
  if (tagIssues.length > 0) {
    console.log(`\nTag consistency issues (${tagIssues.length}):`)
    for (const t of tagIssues) console.log(`  ✗ ${t}`)
    totalIssues += tagIssues.length
  }

  // Filename consistency: filenames not matching id fields
  const files = readdirSync(GAMES_DIR).filter(f => f.endsWith('.json'))
  const filenameIssues: string[] = []
  for (const g of games) {
    const expectedFile = `${g.id}.json`
    if (!files.includes(expectedFile)) {
      filenameIssues.push(`${g.id}: expected file "${expectedFile}" not found`)
    }
  }
  for (const f of files) {
    const expectedId = f.replace('.json', '')
    const game = gameMap.get(expectedId)
    if (game && game.id !== expectedId) {
      filenameIssues.push(`${f}: id field is "${game.id}", expected "${expectedId}"`)
    }
  }
  if (filenameIssues.length > 0) {
    console.log(`\nFilename consistency issues (${filenameIssues.length}):`)
    for (const f of filenameIssues) console.log(`  ✗ ${f}`)
    totalIssues += filenameIssues.length
  }

  // Summary
  console.log(`\n${games.length} games, ${roots.length} roots, ${orphans.length} orphans, ${totalIssues} issue(s)`)
}

main()
