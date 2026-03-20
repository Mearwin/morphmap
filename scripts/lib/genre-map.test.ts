import { describe, it, expect } from 'vitest'
import { mapGenres } from './genre-map.js'

describe('mapGenres', () => {
  it('maps Wikidata genres to tags', () => {
    const result = mapGenres(['action role-playing game', 'adventure video game'])
    expect(result.tags).toContain('action-rpg')
  })

  it('picks most specific tag', () => {
    const result = mapGenres(['first-person shooter', 'action game'])
    expect(result.tags).toContain('fps')
  })

  it('returns unknown genres as-is in tags', () => {
    const result = mapGenres(['some unknown genre'])
    expect(result.tags).toContain('some unknown genre')
  })

  it('handles empty genres', () => {
    const result = mapGenres([])
    expect(result.tags).toEqual([])
  })

  it('deduplicates tags', () => {
    const result = mapGenres(['action role-playing game', 'action role-playing video game'])
    const dupes = result.tags.filter((t, i) => result.tags.indexOf(t) !== i)
    expect(dupes).toEqual([])
  })
})
