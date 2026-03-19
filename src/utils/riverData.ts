import type { Entity, Link } from '../types'

const ERA_SIZE = 5
const FIRST_ERA = 1970
const LAST_ERA = 2025

export type EraGame = {
  id: string
  title: string
  year: number
  incomingCount: number
}

export type EraCategoryCell = {
  count: number
  games: EraGame[]
}

export type EraSlice = {
  eraStart: number
  eraEnd: number
  eraLabel: string
  eraMid: number
  byCategory: Record<string, EraCategoryCell>
}

export type RiverData = {
  slices: EraSlice[]
  categoryIds: string[]
}

export function buildRiverData(
  games: Entity[],
  links: Link[],
  selectedTag: string | null,
  topN: number = 10,
): RiverData {
  const gameById = new Map<string, Entity>()
  for (const g of games) gameById.set(g.id, g)

  // Compute top N tags by frequency
  const tagCounts: Record<string, number> = {}
  for (const g of games) {
    for (const t of g.tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1
    }
  }
  const categoryIds = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([tag]) => tag)

  // Build era boundaries
  const slices: EraSlice[] = []
  for (let start = FIRST_ERA; start < LAST_ERA; start += ERA_SIZE) {
    const end = start + ERA_SIZE
    const byCategory: Record<string, EraCategoryCell> = {}
    for (const catId of categoryIds) {
      byCategory[catId] = { count: 0, games: [] }
    }
    slices.push({
      eraStart: start,
      eraEnd: end,
      eraLabel: `${start}\u2013${end - 1}`,
      eraMid: start + ERA_SIZE / 2,
      byCategory,
    })
  }

  // Index games into era slices
  const gameToSlice = new Map<string, EraSlice>()
  for (const game of games) {
    const year = parseInt(game.date.slice(0, 4), 10)
    const sliceIdx = Math.floor((year - FIRST_ERA) / ERA_SIZE)
    const slice = slices[Math.max(0, Math.min(sliceIdx, slices.length - 1))]
    if (slice) gameToSlice.set(game.id, slice)
  }

  // Count influences received per tag per era
  const filteredLinks = selectedTag
    ? links.filter(l => l.through.includes(selectedTag))
    : links

  // Track per-game incoming count for popover
  const incomingCounts = new Map<string, number>()
  for (const link of filteredLinks) {
    incomingCounts.set(link.target, (incomingCounts.get(link.target) ?? 0) + 1)
  }

  for (const link of filteredLinks) {
    const target = gameById.get(link.target)
    if (!target) continue
    const slice = gameToSlice.get(link.target)
    if (!slice) continue
    // A game contributes to a tag's stream if it has that tag
    for (const tag of target.tags) {
      const cell = slice.byCategory[tag]
      if (cell) cell.count++
    }
  }

  // Populate game lists for each cell
  for (const game of games) {
    const slice = gameToSlice.get(game.id)
    if (!slice) continue
    const incoming = incomingCounts.get(game.id) ?? 0
    for (const tag of game.tags) {
      const cell = slice.byCategory[tag]
      if (!cell) continue
      cell.games.push({
        id: game.id,
        title: game.title,
        year: parseInt(game.date.slice(0, 4), 10),
        incomingCount: incoming,
      })
    }
  }

  // Sort game lists by incoming count descending
  for (const slice of slices) {
    for (const catId of categoryIds) {
      slice.byCategory[catId].games.sort((a, b) => b.incomingCount - a.incomingCount)
    }
  }

  return { slices, categoryIds }
}
