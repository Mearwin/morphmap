import { describe, it, expect } from 'vitest'
import { buildDecadeBuckets } from './heatmapData'
import type { Game, Link } from '../types'

function makeGame(overrides: Partial<Game> & Pick<Game, 'id' | 'date'>): Game {
  return {
    title: overrides.id,
    tags: overrides.tags ?? ['action'],
    influencedBy: [],
    ...overrides,
  }
}

describe('buildDecadeBuckets', () => {
  it('returns all 6 decade buckets even with no data', () => {
    const result = buildDecadeBuckets([], [])
    expect(result).toHaveLength(6)
    expect(result.map((b) => b.decade)).toEqual([1970, 1980, 1990, 2000, 2010, 2020])
    expect(result.map((b) => b.label)).toEqual(['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'])
  })

  it('counts games in correct decade buckets with zero influences when no links', () => {
    const games: Game[] = [
      makeGame({ id: 'a', date: '1993-12-10' }),
      makeGame({ id: 'b', date: '1998-01-01' }),
      makeGame({ id: 'c', date: '2001-06-15' }),
    ]

    const result = buildDecadeBuckets(games, [])
    const bucket90s = result.find((b) => b.decade === 1990)!
    const bucket00s = result.find((b) => b.decade === 2000)!

    expect(bucket90s.gameCount).toBe(2)
    expect(bucket00s.gameCount).toBe(1)
    expect(bucket90s.totalInfluences).toBe(0)
    expect(bucket00s.totalInfluences).toBe(0)
  })

  it('increments byTag and totalInfluences for the target game decade', () => {
    const games: Game[] = [
      makeGame({ id: 'doom', date: '1993-12-10', tags: ['fps'] }),
      makeGame({ id: 'quake', date: '1996-06-22', tags: ['fps'] }),
    ]
    const links: Link[] = [{ source: 'doom', target: 'quake', through: ['engine'] }]

    const result = buildDecadeBuckets(games, links)
    const bucket90s = result.find((b) => b.decade === 1990)!

    expect(bucket90s.totalInfluences).toBe(1)
    expect(bucket90s.byTag['fps']).toBe(1)
  })

  it('puts 1999 in 1990s and 2000 in 2000s', () => {
    const games: Game[] = [
      makeGame({ id: 'late90s', date: '1999-12-31' }),
      makeGame({ id: 'early00s', date: '2000-01-01' }),
    ]

    const result = buildDecadeBuckets(games, [])
    expect(result.find((b) => b.decade === 1990)!.gameCount).toBe(1)
    expect(result.find((b) => b.decade === 2000)!.gameCount).toBe(1)
  })

  it('uses the tags of the target game, not the source game', () => {
    const games: Game[] = [
      makeGame({ id: 'src', date: '1985-01-01', tags: ['platformer'] }),
      makeGame({ id: 'tgt', date: '1995-06-01', tags: ['rpg'] }),
    ]
    const links: Link[] = [{ source: 'src', target: 'tgt', through: ['mechanic'] }]

    const result = buildDecadeBuckets(games, links)
    const bucket90s = result.find((b) => b.decade === 1990)!

    expect(bucket90s.byTag['rpg']).toBe(1)
    expect(bucket90s.byTag['platformer']).toBeUndefined()
  })

  it('returns all 6 decade buckets even when games only span a few decades', () => {
    const games: Game[] = [
      makeGame({ id: 'only2010s', date: '2017-03-03' }),
    ]

    const result = buildDecadeBuckets(games, [])
    expect(result).toHaveLength(6)
    expect(result.find((b) => b.decade === 1970)!.gameCount).toBe(0)
    expect(result.find((b) => b.decade === 2010)!.gameCount).toBe(1)
  })
})
