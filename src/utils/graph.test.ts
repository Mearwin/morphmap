import { describe, it, expect } from 'vitest'
import type { Game } from '../types'
import {
  buildLinks,
  buildAdjacency,
  getAncestors,
  getDescendants,
} from './graph'

const makeGame = (id: string, influencedBy: { id: string; through: string[] }[] = []): Game => ({
  id,
  title: id,
  date: '2000-01-01',
  tags: ['action'],
  influencedBy,
})

// A -> B -> C (A influences B, B influences C)
const games: Game[] = [
  makeGame('a'),
  makeGame('b', [{ id: 'a', through: ['mechanic-x'] }]),
  makeGame('c', [{ id: 'b', through: ['mechanic-y'] }]),
]

describe('buildLinks', () => {
  it('creates directional links from influencedBy', () => {
    const links = buildLinks(games)
    expect(links).toEqual([
      { source: 'a', target: 'b', through: ['mechanic-x'] },
      { source: 'b', target: 'c', through: ['mechanic-y'] },
    ])
  })

  it('skips references to games not in the list', () => {
    const partial = [makeGame('b', [{ id: 'a', through: ['x'] }])]
    expect(buildLinks(partial)).toEqual([])
  })
})

describe('getAncestors', () => {
  it('returns all transitive ancestors', () => {
    const links = buildLinks(games)
    expect(getAncestors('c', links)).toEqual(new Set(['a', 'b']))
  })

  it('returns empty set for root node', () => {
    const links = buildLinks(games)
    expect(getAncestors('a', links)).toEqual(new Set())
  })
})

describe('getDescendants', () => {
  it('returns all transitive descendants', () => {
    const links = buildLinks(games)
    expect(getDescendants('a', links)).toEqual(new Set(['b', 'c']))
  })

  it('returns empty set for leaf node', () => {
    const links = buildLinks(games)
    expect(getDescendants('c', links)).toEqual(new Set())
  })
})

describe('buildAdjacency', () => {
  it('creates forward and reverse maps', () => {
    const links = buildLinks(games)
    const adj = buildAdjacency(links)
    expect(adj.forward.get('a')).toEqual(new Set(['b']))
    expect(adj.forward.get('b')).toEqual(new Set(['c']))
    expect(adj.reverse.get('b')).toEqual(new Set(['a']))
    expect(adj.reverse.get('c')).toEqual(new Set(['b']))
  })
})
