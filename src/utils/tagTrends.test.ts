import { describe, it, expect } from 'vitest'
import { buildTagTrends } from './tagTrends'
import type { Entity } from '../types'

function makeGame(id: string, year: number, tags: string[]): Entity {
  return {
    id,
    title: id,
    date: `${year}-01-01`,
    tags,
    influencedBy: [],
  }
}

describe('buildTagTrends', () => {
  it('returns empty for no games', () => {
    const result = buildTagTrends([])
    expect(result.buckets).toEqual([])
    expect(result.tags).toEqual([])
  })

  it('buckets games into 5-year periods', () => {
    const games = [
      makeGame('a', 1972, ['arcade']),
      makeGame('b', 1974, ['arcade']),
      makeGame('c', 1978, ['arcade']),
    ]
    const result = buildTagTrends(games)
    expect(result.buckets).toEqual([1970, 1975])
    const arcadeData = result.tags.find(t => t.tag === 'arcade')!
    expect(arcadeData.data).toEqual([
      { bucket: 1970, count: 2 },
      { bucket: 1975, count: 1 },
    ])
  })

  it('selects top N tags by count', () => {
    const games = [
      makeGame('a', 1990, ['fps', 'shooter', 'rare']),
      makeGame('b', 1991, ['fps', 'shooter']),
      makeGame('c', 1992, ['fps']),
    ]
    const result = buildTagTrends(games, 2)
    expect(result.tags.length).toBe(2)
    expect(result.tags[0].tag).toBe('fps')
    expect(result.tags[1].tag).toBe('shooter')
  })

  it('zero-fills missing buckets', () => {
    const games = [
      makeGame('a', 1970, ['arcade']),
      makeGame('b', 1980, ['arcade']),
    ]
    const result = buildTagTrends(games)
    expect(result.buckets).toEqual([1970, 1975, 1980])
    const arcadeData = result.tags.find(t => t.tag === 'arcade')!
    expect(arcadeData.data).toEqual([
      { bucket: 1970, count: 1 },
      { bucket: 1975, count: 0 },
      { bucket: 1980, count: 1 },
    ])
  })

  it('handles multiple tags across buckets', () => {
    const games = [
      makeGame('a', 1990, ['fps', 'action']),
      makeGame('b', 1995, ['fps', 'rpg']),
      makeGame('c', 1996, ['rpg', 'action']),
    ]
    const result = buildTagTrends(games, 10)
    expect(result.tags.length).toBe(3)

    const fps = result.tags.find(t => t.tag === 'fps')!
    expect(fps.data.find(d => d.bucket === 1990)?.count).toBe(1)
    expect(fps.data.find(d => d.bucket === 1995)?.count).toBe(1)

    const rpg = result.tags.find(t => t.tag === 'rpg')!
    expect(rpg.data.find(d => d.bucket === 1995)?.count).toBe(2)
  })

  it('returns buckets sorted ascending', () => {
    const games = [
      makeGame('a', 2020, ['x']),
      makeGame('b', 1970, ['x']),
      makeGame('c', 1990, ['x']),
    ]
    const result = buildTagTrends(games)
    for (let i = 1; i < result.buckets.length; i++) {
      expect(result.buckets[i]).toBeGreaterThan(result.buckets[i - 1])
    }
  })
})
