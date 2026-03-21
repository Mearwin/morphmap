import { describe, it, expect } from 'vitest'
import {
  buildTagIndex,
  computeTagPositions,
  computeTagColors,
  hslFromPosition,
  explainGameColor,
  computeNormParams,
} from './tagColor'
import type { Entity } from '../types'

function makeEntity(overrides: Partial<Entity> & Pick<Entity, 'id' | 'tags'>): Entity {
  return {
    title: overrides.id,
    date: '2000-01-01',
    influencedBy: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// buildTagIndex (which internally calls spectralOrder)
// ---------------------------------------------------------------------------
describe('buildTagIndex', () => {
  it('returns empty with 0 tags', () => {
    const { tagIndex, totalTags, orderedTags } = buildTagIndex([])
    expect(tagIndex.size).toBe(0)
    expect(totalTags).toBe(0)
    expect(orderedTags).toEqual([])
  })

  it('returns the single tag with 1 tag', () => {
    const games = [makeEntity({ id: 'a', tags: ['solo'] })]
    const { tagIndex, totalTags, orderedTags } = buildTagIndex(games)
    expect(orderedTags).toEqual(['solo'])
    expect(totalTags).toBe(1)
    expect(tagIndex.get('solo')).toBe(0)
  })

  it('returns both tags with 2 tags', () => {
    const games = [makeEntity({ id: 'a', tags: ['alpha', 'beta'] })]
    const { orderedTags, totalTags } = buildTagIndex(games)
    expect(orderedTags).toHaveLength(2)
    expect(totalTags).toBe(2)
    expect(orderedTags).toContain('alpha')
    expect(orderedTags).toContain('beta')
  })

  it('returns all unique tags from games', () => {
    const games = [
      makeEntity({ id: 'a', tags: ['fps', 'action'] }),
      makeEntity({ id: 'b', tags: ['rpg', 'action'] }),
      makeEntity({ id: 'c', tags: ['fps', 'multiplayer'] }),
    ]
    const { orderedTags } = buildTagIndex(games)
    expect(orderedTags).toHaveLength(4)
    expect(new Set(orderedTags)).toEqual(new Set(['fps', 'action', 'rpg', 'multiplayer']))
  })

  it('returns correct totalTags count', () => {
    const games = [
      makeEntity({ id: 'a', tags: ['x', 'y', 'z'] }),
      makeEntity({ id: 'b', tags: ['x', 'w'] }),
    ]
    const { totalTags } = buildTagIndex(games)
    expect(totalTags).toBe(4) // x, y, z, w
  })

  it('orderedTags contains every tag exactly once', () => {
    const games = [
      makeEntity({ id: 'a', tags: ['a', 'b', 'c'] }),
      makeEntity({ id: 'b', tags: ['a', 'b', 'd'] }),
      makeEntity({ id: 'c', tags: ['c', 'd', 'e'] }),
    ]
    const { orderedTags } = buildTagIndex(games)
    expect(orderedTags).toHaveLength(5)
    expect(new Set(orderedTags).size).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// spectralOrder (tested indirectly through buildTagIndex)
// ---------------------------------------------------------------------------
describe('spectralOrder via buildTagIndex', () => {
  it('places co-occurring tag clusters adjacently', () => {
    // Cluster 1: tags A, B always appear together
    // Cluster 2: tags C, D always appear together
    // They should form two adjacent pairs in the ordering
    const games = [
      makeEntity({ id: 'g1', tags: ['A', 'B'] }),
      makeEntity({ id: 'g2', tags: ['A', 'B'] }),
      makeEntity({ id: 'g3', tags: ['A', 'B'] }),
      makeEntity({ id: 'g4', tags: ['C', 'D'] }),
      makeEntity({ id: 'g5', tags: ['C', 'D'] }),
      makeEntity({ id: 'g6', tags: ['C', 'D'] }),
    ]
    const { orderedTags } = buildTagIndex(games)

    const idxA = orderedTags.indexOf('A')
    const idxB = orderedTags.indexOf('B')
    const idxC = orderedTags.indexOf('C')
    const idxD = orderedTags.indexOf('D')

    // A and B should be adjacent
    expect(Math.abs(idxA - idxB)).toBe(1)
    // C and D should be adjacent
    expect(Math.abs(idxC - idxD)).toBe(1)
  })

  it('is deterministic: same input produces same output', () => {
    const games = [
      makeEntity({ id: 'g1', tags: ['fps', 'action', 'multiplayer'] }),
      makeEntity({ id: 'g2', tags: ['rpg', 'story', 'singleplayer'] }),
      makeEntity({ id: 'g3', tags: ['fps', 'multiplayer'] }),
      makeEntity({ id: 'g4', tags: ['rpg', 'story'] }),
      makeEntity({ id: 'g5', tags: ['action', 'fps'] }),
    ]
    const result1 = buildTagIndex(games)
    const result2 = buildTagIndex(games)
    expect(result1.orderedTags).toEqual(result2.orderedTags)
  })
})

// ---------------------------------------------------------------------------
// computeTagPositions
// ---------------------------------------------------------------------------
describe('computeTagPositions', () => {
  it('returns empty map for empty games', () => {
    const positions = computeTagPositions([])
    expect(positions.size).toBe(0)
  })

  it('returns a position for a single game', () => {
    const games = [makeEntity({ id: 'solo', tags: ['a'] })]
    const positions = computeTagPositions(games)
    expect(positions.size).toBe(1)
    expect(positions.has('solo')).toBe(true)
    // Single game gets stretched to 0 (min == max → range defaults to 1)
    expect(typeof positions.get('solo')).toBe('number')
  })

  it('gives games with identical tags the same position', () => {
    const games = [
      makeEntity({ id: 'g1', tags: ['x', 'y'] }),
      makeEntity({ id: 'g2', tags: ['x', 'y'] }),
    ]
    const positions = computeTagPositions(games)
    expect(positions.get('g1')).toBe(positions.get('g2'))
  })

  it('gives games with completely different tags different positions', () => {
    // Need enough tags to trigger spectral ordering (>2 tags total)
    const games = [
      makeEntity({ id: 'g1', tags: ['a', 'b', 'c'] }),
      makeEntity({ id: 'g2', tags: ['a', 'b', 'c'] }),
      makeEntity({ id: 'g3', tags: ['d', 'e', 'f'] }),
      makeEntity({ id: 'g4', tags: ['d', 'e', 'f'] }),
    ]
    const positions = computeTagPositions(games)
    expect(positions.get('g1')).not.toBe(positions.get('g3'))
  })

  it('produces positions in [0, 1] range', () => {
    const games = [
      makeEntity({ id: 'g1', tags: ['fps', 'action'] }),
      makeEntity({ id: 'g2', tags: ['rpg', 'story'] }),
      makeEntity({ id: 'g3', tags: ['fps', 'multiplayer'] }),
      makeEntity({ id: 'g4', tags: ['rpg', 'turn-based'] }),
      makeEntity({ id: 'g5', tags: ['puzzle', 'casual'] }),
    ]
    const positions = computeTagPositions(games)
    for (const [, pos] of positions) {
      expect(pos).toBeGreaterThanOrEqual(0)
      expect(pos).toBeLessThanOrEqual(1)
    }
  })

  it('games sharing more tags have closer positions than games sharing fewer', () => {
    // g1 and g2 share 2 tags; g1 and g3 share 0 tags
    const games = [
      makeEntity({ id: 'g1', tags: ['a', 'b', 'c'] }),
      makeEntity({ id: 'g2', tags: ['a', 'b', 'd'] }),
      makeEntity({ id: 'g3', tags: ['e', 'f', 'g'] }),
      // Add more games to strengthen co-occurrence signal
      makeEntity({ id: 'g4', tags: ['a', 'b'] }),
      makeEntity({ id: 'g5', tags: ['e', 'f'] }),
      makeEntity({ id: 'g6', tags: ['a', 'c'] }),
      makeEntity({ id: 'g7', tags: ['e', 'g'] }),
    ]
    const positions = computeTagPositions(games)
    const p1 = positions.get('g1')!
    const p2 = positions.get('g2')!
    const p3 = positions.get('g3')!

    const distClose = Math.abs(p1 - p2)
    const distFar = Math.abs(p1 - p3)
    expect(distClose).toBeLessThan(distFar)
  })
})

// ---------------------------------------------------------------------------
// computeTagColors
// ---------------------------------------------------------------------------
describe('computeTagColors', () => {
  it('returns a color for every game', () => {
    const games = [
      makeEntity({ id: 'g1', tags: ['a'] }),
      makeEntity({ id: 'g2', tags: ['b'] }),
      makeEntity({ id: 'g3', tags: ['c'] }),
    ]
    const colors = computeTagColors(games)
    expect(colors.size).toBe(3)
    expect(colors.has('g1')).toBe(true)
    expect(colors.has('g2')).toBe(true)
    expect(colors.has('g3')).toBe(true)
  })

  it('returns valid HSL strings', () => {
    const games = [
      makeEntity({ id: 'g1', tags: ['a', 'b'] }),
      makeEntity({ id: 'g2', tags: ['c', 'd'] }),
    ]
    const colors = computeTagColors(games)
    const hslPattern = /^hsl\(\d{1,3}, 70%, 55%\)$/
    for (const [, color] of colors) {
      expect(color).toMatch(hslPattern)
    }
  })

  it('games with same tags get the same color', () => {
    const games = [
      makeEntity({ id: 'g1', tags: ['x', 'y'] }),
      makeEntity({ id: 'g2', tags: ['x', 'y'] }),
    ]
    const colors = computeTagColors(games)
    expect(colors.get('g1')).toBe(colors.get('g2'))
  })
})

// ---------------------------------------------------------------------------
// hslFromPosition
// ---------------------------------------------------------------------------
describe('hslFromPosition', () => {
  it('position 0 gives hsl(0, 70%, 55%)', () => {
    expect(hslFromPosition(0)).toBe('hsl(0, 70%, 55%)')
  })

  it('position 1 gives hsl(360, 70%, 55%)', () => {
    expect(hslFromPosition(1)).toBe('hsl(360, 70%, 55%)')
  })

  it('position 0.5 gives hsl(180, 70%, 55%)', () => {
    expect(hslFromPosition(0.5)).toBe('hsl(180, 70%, 55%)')
  })
})

// ---------------------------------------------------------------------------
// explainGameColor
// ---------------------------------------------------------------------------
describe('explainGameColor', () => {
  it('returns correct number of tagPositions', () => {
    const games = [
      makeEntity({ id: 'g1', tags: ['a', 'b', 'c'] }),
      makeEntity({ id: 'g2', tags: ['a', 'b'] }),
    ]
    const { tagIndex, totalTags } = buildTagIndex(games)
    const { min, range } = computeNormParams(games)
    const result = explainGameColor(['a', 'b', 'c'], tagIndex, totalTags, min, range)
    expect(result.tagPositions).toHaveLength(3)
  })

  it('average is in [0, 1]', () => {
    const games = [
      makeEntity({ id: 'g1', tags: ['x', 'y', 'z'] }),
      makeEntity({ id: 'g2', tags: ['x', 'w'] }),
    ]
    const { tagIndex, totalTags } = buildTagIndex(games)
    const { min, range } = computeNormParams(games)
    const result = explainGameColor(['x', 'y', 'z'], tagIndex, totalTags, min, range)
    expect(result.average).toBeGreaterThanOrEqual(0)
    expect(result.average).toBeLessThanOrEqual(1)
  })

  it('filters out tags not in the index', () => {
    const games = [
      makeEntity({ id: 'g1', tags: ['a', 'b'] }),
    ]
    const { tagIndex, totalTags } = buildTagIndex(games)
    const { min, range } = computeNormParams(games)
    const result = explainGameColor(['a', 'b', 'nonexistent'], tagIndex, totalTags, min, range)
    expect(result.tagPositions).toHaveLength(2)
    expect(result.tagPositions.map(tp => tp.tag)).not.toContain('nonexistent')
  })
})

// ---------------------------------------------------------------------------
// computeNormParams
// ---------------------------------------------------------------------------
describe('computeNormParams', () => {
  it('returns min=0 for empty games', () => {
    const { min } = computeNormParams([])
    expect(min).toBe(0)
  })

  it('returns a non-zero range for a single game', () => {
    const games = [makeEntity({ id: 'g1', tags: ['a'] })]
    const { range } = computeNormParams(games)
    // Single game means min == max, so (max - min) || 1 = 1
    expect(range).toBe(1)
  })

  it('returns range > 0', () => {
    const games = [
      makeEntity({ id: 'g1', tags: ['a', 'b'] }),
      makeEntity({ id: 'g2', tags: ['c', 'd'] }),
    ]
    const { range } = computeNormParams(games)
    expect(range).toBeGreaterThan(0)
  })

  it('returns min <= min + range conceptually', () => {
    const games = [
      makeEntity({ id: 'g1', tags: ['fps', 'action'] }),
      makeEntity({ id: 'g2', tags: ['rpg', 'story'] }),
      makeEntity({ id: 'g3', tags: ['fps', 'multiplayer'] }),
    ]
    const { min, range } = computeNormParams(games)
    expect(min).toBeGreaterThanOrEqual(0)
    expect(range).toBeGreaterThan(0)
    // max = min + range, so max >= min always holds
    expect(min + range).toBeGreaterThanOrEqual(min)
  })
})
