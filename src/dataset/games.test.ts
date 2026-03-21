import { describe, it, expect } from 'vitest'
import { createGamesDatasetConfig } from './games'
import type { Entity } from '../types'
import type { PrecomputedTagIndex } from './games'

const games: Entity[] = [
  { id: 'a', title: 'A', date: '2000-01-01', tags: ['fps', 'action'], influencedBy: [] },
  { id: 'b', title: 'B', date: '2005-01-01', tags: ['rpg', 'story'], influencedBy: [{ id: 'a', through: ['action'] }] },
]

describe('createGamesDatasetConfig', () => {
  it('uses precomputed tag index when provided', () => {
    const precomputed: PrecomputedTagIndex = {
      orderedTags: ['action', 'fps', 'rpg', 'story'],
      normMin: 0.1,
      normRange: 0.8,
      tagPositions: { a: 0.3, b: 0.7 },
    }
    const config = createGamesDatasetConfig(games, precomputed)

    expect(config.tagPositions.get('a')).toBe(0.3)
    expect(config.tagPositions.get('b')).toBe(0.7)
    expect(config.normMin).toBe(0.1)
    expect(config.normRange).toBe(0.8)
    expect(config.totalTags).toBe(4)
    expect(config.tagIndex.get('action')).toBe(0)
    expect(config.tagIndex.get('story')).toBe(3)
  })

  it('falls back to computing at runtime when no precomputed data', () => {
    const config = createGamesDatasetConfig(games)

    expect(config.tagPositions.size).toBe(2)
    expect(config.totalTags).toBe(4)
    expect(config.tagIndex.size).toBe(4)
  })
})
