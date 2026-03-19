// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { parseHash, buildHash, readInitialStateFromHash } from './useHashState'

beforeEach(() => {
  window.location.hash = ''
})

describe('parseHash', () => {
  it('returns nulls when hash is empty', () => {
    expect(parseHash()).toEqual({ game: null, tag: null, timeRange: null, view: null, embed: false, depth: null })
  })

  it('parses game id', () => {
    window.location.hash = '#game=dark-souls'
    expect(parseHash().game).toBe('dark-souls')
  })

  it('parses tag', () => {
    window.location.hash = '#tag=action-rpg'
    expect(parseHash().tag).toBe('action-rpg')
  })

  it('parses time range', () => {
    window.location.hash = '#from=1990&to=2005'
    expect(parseHash().timeRange).toEqual({ from: 1990, to: 2005 })
  })

  it('parses all params together', () => {
    window.location.hash = '#game=doom&tag=fps&from=1993&to=2000'
    const result = parseHash()
    expect(result.game).toBe('doom')
    expect(result.tag).toBe('fps')
    expect(result.timeRange).toEqual({ from: 1993, to: 2000 })
  })

  it('returns null timeRange for non-numeric values', () => {
    window.location.hash = '#from=abc&to=xyz'
    expect(parseHash().timeRange).toBeNull()
  })

  it('returns null timeRange if only one bound is set', () => {
    window.location.hash = '#from=1990'
    expect(parseHash().timeRange).toBeNull()
  })

  it('parses view=river', () => {
    window.location.hash = '#view=river'
    expect(parseHash().view).toBe('river')
  })

  it('returns null view for non-river values', () => {
    window.location.hash = '#view=other'
    expect(parseHash().view).toBeNull()
  })

  it('parses view=lineage', () => {
    window.location.hash = '#view=lineage'
    expect(parseHash().view).toBe('lineage')
  })

  it('returns null view for unknown view values', () => {
    window.location.hash = '#view=unknown'
    expect(parseHash().view).toBeNull()
  })

  it('parses embed=true', () => {
    window.location.hash = '#embed=true'
    expect(parseHash().embed).toBe(true)
  })

  it('returns embed false when no embed param', () => {
    window.location.hash = '#game=doom'
    expect(parseHash().embed).toBe(false)
  })

  it('parses depth=2', () => {
    window.location.hash = '#depth=2'
    expect(parseHash().depth).toBe(2)
  })

  it('returns null depth when no depth param', () => {
    window.location.hash = '#game=doom'
    expect(parseHash().depth).toBeNull()
  })

  it('returns null depth for non-numeric depth', () => {
    window.location.hash = '#depth=abc'
    expect(parseHash().depth).toBeNull()
  })
})

describe('buildHash', () => {
  const empty = { selectedGameId: null, selectedTag: null, timeRange: null, viewMode: 'timeline' as const, embed: false, depth: null }

  it('returns empty string for empty state', () => {
    expect(buildHash(empty)).toBe('')
  })

  it('encodes game', () => {
    expect(buildHash({ ...empty, selectedGameId: 'doom' })).toBe('#game=doom')
  })

  it('encodes tag', () => {
    expect(buildHash({ ...empty, selectedTag: 'fps' })).toBe('#tag=fps')
  })

  it('encodes time range', () => {
    const hash = buildHash({ ...empty, timeRange: { from: 1990, to: 2000 } })
    expect(hash).toContain('from=1990')
    expect(hash).toContain('to=2000')
  })

  it('encodes river view', () => {
    expect(buildHash({ ...empty, viewMode: 'river' })).toBe('#view=river')
  })

  it('encodes lineage view', () => {
    expect(buildHash({ ...empty, viewMode: 'lineage' })).toBe('#view=lineage')
  })

  it('does not encode timeline view', () => {
    expect(buildHash({ ...empty, viewMode: 'timeline' })).toBe('')
  })

  it('encodes all params', () => {
    const hash = buildHash({
      selectedGameId: 'doom',
      selectedTag: 'fps',
      timeRange: { from: 1993, to: 2000 },
      viewMode: 'timeline',
      embed: false,
      depth: null,
    })
    expect(hash).toContain('game=doom')
    expect(hash).toContain('tag=fps')
    expect(hash).toContain('from=1993')
    expect(hash).toContain('to=2000')
    expect(hash.startsWith('#')).toBe(true)
  })

  it('encodes embed=true', () => {
    expect(buildHash({ ...empty, embed: true })).toContain('embed=true')
  })

  it('does not encode embed when false', () => {
    expect(buildHash({ ...empty, embed: false })).not.toContain('embed')
  })

  it('encodes depth=2', () => {
    expect(buildHash({ ...empty, depth: 2 })).toContain('depth=2')
  })

  it('does not encode depth when null', () => {
    expect(buildHash({ ...empty, depth: null })).not.toContain('depth')
  })
})

describe('readInitialStateFromHash', () => {
  it('returns empty object for no hash', () => {
    expect(readInitialStateFromHash()).toEqual({})
  })

  it('returns selectedGameId when game is in hash', () => {
    window.location.hash = '#game=doom'
    expect(readInitialStateFromHash()).toEqual({ selectedGameId: 'doom' })
  })

  it('returns all fields when all present', () => {
    window.location.hash = '#game=doom&tag=fps&from=1993&to=2000'
    expect(readInitialStateFromHash()).toEqual({
      selectedGameId: 'doom',
      selectedTag: 'fps',
      timeRange: { from: 1993, to: 2000 },
    })
  })

  it('returns viewMode when view=river in hash', () => {
    window.location.hash = '#view=river'
    expect(readInitialStateFromHash()).toEqual({ viewMode: 'river' })
  })

  it('returns embed and depth when present in hash', () => {
    window.location.hash = '#game=doom&embed=true&depth=3'
    expect(readInitialStateFromHash()).toEqual({ selectedGameId: 'doom', embed: true, depth: 3 })
  })
})
