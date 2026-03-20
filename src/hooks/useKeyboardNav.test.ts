import { describe, it, expect } from 'vitest'
import { getDirectNeighbors, sortByDate, closestByDate } from './useKeyboardNav'
import type { Link, Game } from '../types'

const links: Link[] = [
  { source: 'pong', target: 'space-invaders', through: ['arcade'] },
  { source: 'space-invaders', target: 'asteroids', through: ['arcade', 'shooter'] },
  { source: 'pong', target: 'breakout', through: ['arcade'] },
]

const games: Game[] = [
  { id: 'pong', title: 'Pong', date: '1972-11-29', tags: ['arcade'], influencedBy: [] },
  { id: 'breakout', title: 'Breakout', date: '1976-05-13', tags: ['arcade'], influencedBy: [] },
  { id: 'space-invaders', title: 'Space Invaders', date: '1978-06-01', tags: ['arcade'], influencedBy: [] },
  { id: 'asteroids', title: 'Asteroids', date: '1979-11-01', tags: ['arcade'], influencedBy: [] },
]

describe('getDirectNeighbors', () => {
  it('returns ancestors and descendants for a middle node', () => {
    const result = getDirectNeighbors('space-invaders', links)
    expect(result.ancestors).toEqual(['pong'])
    expect(result.descendants).toEqual(['asteroids'])
  })

  it('returns only descendants for a root node', () => {
    const result = getDirectNeighbors('pong', links)
    expect(result.ancestors).toEqual([])
    expect(result.descendants).toContain('space-invaders')
    expect(result.descendants).toContain('breakout')
  })

  it('returns only ancestors for a leaf node', () => {
    const result = getDirectNeighbors('asteroids', links)
    expect(result.ancestors).toEqual(['space-invaders'])
    expect(result.descendants).toEqual([])
  })

  it('returns empty arrays for unknown node', () => {
    const result = getDirectNeighbors('unknown', links)
    expect(result.ancestors).toEqual([])
    expect(result.descendants).toEqual([])
  })

  it('returns empty arrays for empty links', () => {
    const result = getDirectNeighbors('pong', [])
    expect(result.ancestors).toEqual([])
    expect(result.descendants).toEqual([])
  })
})

describe('sortByDate', () => {
  it('sorts ids by game date ascending', () => {
    const sorted = sortByDate(['asteroids', 'pong', 'space-invaders'], games)
    expect(sorted).toEqual(['pong', 'space-invaders', 'asteroids'])
  })

  it('handles single id', () => {
    expect(sortByDate(['pong'], games)).toEqual(['pong'])
  })

  it('handles empty array', () => {
    expect(sortByDate([], games)).toEqual([])
  })

  it('handles unknown ids gracefully', () => {
    // Unknown ids should stay in relative order (sort returns 0)
    const sorted = sortByDate(['unknown', 'pong'], games)
    expect(sorted).toContain('pong')
    expect(sorted).toContain('unknown')
  })

  it('does not mutate the original array', () => {
    const ids = ['asteroids', 'pong']
    sortByDate(ids, games)
    expect(ids).toEqual(['asteroids', 'pong'])
  })
})

describe('closestByDate', () => {
  it('picks the neighbor closest in time to the selected game', () => {
    // space-invaders (1978) has ancestors: pong (1972). Closest = pong (only one)
    expect(closestByDate('space-invaders', ['pong'], games)).toBe('pong')
  })

  it('picks closest among multiple neighbors', () => {
    // pong (1972) has descendants: space-invaders (1978), breakout (1976)
    // Closest to 1972 is breakout (1976, 4yr gap) vs space-invaders (1978, 6yr gap)
    expect(closestByDate('pong', ['space-invaders', 'breakout'], games)).toBe('breakout')
  })

  it('returns null for empty neighbor list', () => {
    expect(closestByDate('pong', [], games)).toBeNull()
  })

  it('handles single neighbor', () => {
    expect(closestByDate('asteroids', ['space-invaders'], games)).toBe('space-invaders')
  })
})
