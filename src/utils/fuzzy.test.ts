import { describe, it, expect } from 'vitest'
import { fuzzyScore, fuzzyMatchIndices, fuzzyFilter } from './fuzzy'

describe('fuzzyScore', () => {
  it('returns 0 for empty pattern', () => {
    expect(fuzzyScore('', 'anything')).toBe(0)
  })

  it('returns -1 when pattern is longer than text', () => {
    expect(fuzzyScore('abcdef', 'abc')).toBe(-1)
  })

  it('returns -1 for no match', () => {
    expect(fuzzyScore('xyz', 'Pong')).toBe(-1)
  })

  it('returns positive score for matching', () => {
    expect(fuzzyScore('pong', 'Pong')).toBeGreaterThan(0)
  })

  it('scores exact match higher than partial', () => {
    const exact = fuzzyScore('dark', 'Dark Souls')
    const partial = fuzzyScore('dark', 'Markdown Editor')
    expect(exact).toBeGreaterThan(partial)
  })

  it('is case insensitive', () => {
    expect(fuzzyScore('PONG', 'pong')).toBeGreaterThan(0)
  })
})

describe('fuzzyMatchIndices', () => {
  it('returns empty array for empty pattern', () => {
    expect(fuzzyMatchIndices('', 'test')).toEqual([])
  })

  it('returns null for no match', () => {
    expect(fuzzyMatchIndices('xyz', 'Pong')).toBeNull()
  })

  it('returns null when pattern is longer than text', () => {
    expect(fuzzyMatchIndices('abcdef', 'abc')).toBeNull()
  })

  it('returns correct indices for exact prefix', () => {
    expect(fuzzyMatchIndices('pon', 'Pong')).toEqual([0, 1, 2])
  })

  it('returns correct indices for scattered match', () => {
    expect(fuzzyMatchIndices('dk', 'Dark Souls')).toEqual([0, 3])
  })

  it('is case insensitive', () => {
    expect(fuzzyMatchIndices('DS', 'Dark Souls')).toEqual([0, 5])
  })
})

describe('fuzzyFilter', () => {
  const items = [
    { id: 'a', name: 'Dark Souls' },
    { id: 'b', name: 'Pong' },
    { id: 'c', name: 'Darksiders' },
  ]

  it('returns empty for empty query', () => {
    expect(fuzzyFilter(items, '', i => i.name)).toEqual([])
  })

  it('returns matching items with indices', () => {
    const results = fuzzyFilter(items, 'dark', i => i.name)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].item.name).toContain('Dark')
    expect(results[0].indices).toEqual([0, 1, 2, 3])
  })

  it('respects limit', () => {
    const results = fuzzyFilter(items, 'd', i => i.name, 1)
    expect(results).toHaveLength(1)
  })

  it('sorts by score descending', () => {
    const results = fuzzyFilter(items, 'dark', i => i.name)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })
})
