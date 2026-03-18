import { describe, it, expect } from 'vitest'
import { mapGenres } from './genre-map.js'

describe('mapGenres', () => {
  it('maps Wikidata genres to tags and primaryTag', () => {
    const result = mapGenres(['action role-playing game', 'adventure video game'])
    expect(result.tags).toContain('action-rpg')
    expect(result.primaryTag).toBe('rpg')
  })

  it('picks most specific primaryTag', () => {
    const result = mapGenres(['first-person shooter', 'action game'])
    expect(result.primaryTag).toBe('fps')
  })

  it('returns default for unknown genres', () => {
    const result = mapGenres(['some unknown genre'])
    expect(result.primaryTag).toBe('action-adventure')
    expect(result.tags).toContain('some unknown genre')
  })

  it('handles empty genres', () => {
    const result = mapGenres([])
    expect(result.primaryTag).toBe('action-adventure')
    expect(result.tags).toEqual([])
  })

  it('deduplicates tags', () => {
    const result = mapGenres(['action role-playing game', 'action role-playing video game'])
    const dupes = result.tags.filter((t, i) => result.tags.indexOf(t) !== i)
    expect(dupes).toEqual([])
  })
})
