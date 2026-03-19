import type { Game, Link } from '../types'
import { getYear } from './date'

export type DecadeBucket = {
  decade: number
  label: string
  gameCount: number
  totalInfluences: number
  byTag: Record<string, number>
}

const DECADES = [1970, 1980, 1990, 2000, 2010, 2020] as const

export function buildDecadeBuckets(games: Game[], links: Link[]): DecadeBucket[] {
  const gameById = new Map<string, Game>()
  for (const game of games) {
    gameById.set(game.id, game)
  }

  const buckets = new Map<number, DecadeBucket>()
  for (const decade of DECADES) {
    buckets.set(decade, {
      decade,
      label: `${decade}s`,
      gameCount: 0,
      totalInfluences: 0,
      byTag: {},
    })
  }

  for (const game of games) {
    const decade = Math.floor(getYear(game.date) / 10) * 10
    const bucket = buckets.get(decade)
    if (bucket) {
      bucket.gameCount++
    }
  }

  for (const link of links) {
    const target = gameById.get(link.target)
    if (!target) continue

    const decade = Math.floor(getYear(target.date) / 10) * 10
    const bucket = buckets.get(decade)
    if (!bucket) continue

    bucket.totalInfluences++
    for (const tag of target.tags) {
      bucket.byTag[tag] = (bucket.byTag[tag] ?? 0) + 1
    }
  }

  return [...buckets.values()].sort((a, b) => a.decade - b.decade)
}
