import { describe, it, expect } from 'vitest'
import type { Game } from '../types'
import { buildLinks, buildAdjacency } from './graph'
import { buildLineageData } from './lineageLayout'

const makeGame = (id: string, date: string, influencedBy: { id: string; through: string[] }[] = []): Game => ({
  id,
  title: id.charAt(0).toUpperCase() + id.slice(1),
  date,
  tags: ['action'],
  influencedBy,
})

// Chain: a -> b -> c -> d (a influences b, b influences c, c influences d)
const games: Game[] = [
  makeGame('a', '1990-01-01'),
  makeGame('b', '1995-01-01', [{ id: 'a', through: ['mechanic-x'] }]),
  makeGame('c', '2000-01-01', [{ id: 'b', through: ['mechanic-y'] }]),
  makeGame('d', '2005-01-01', [{ id: 'c', through: ['mechanic-z'] }]),
]

describe('buildLineageData', () => {
  const links = buildLinks(games)
  const adjacency = buildAdjacency(links)
  const gameMap = new Map(games.map(g => [g.id, g]))

  it('places selected game at depth 0', () => {
    const result = buildLineageData('b', gameMap, links, adjacency)
    const selectedCol = result.columns.find(c => c.depth === 0)
    expect(selectedCol).toBeDefined()
    expect(selectedCol!.games).toHaveLength(1)
    expect(selectedCol!.games[0].id).toBe('b')
  })

  it('places ancestors at negative depths', () => {
    const result = buildLineageData('c', gameMap, links, adjacency)
    const depths = result.columns.map(c => c.depth).sort((a, b) => a - b)
    expect(depths).toEqual([-2, -1, 0, 1])
    const depthMinus1 = result.columns.find(c => c.depth === -1)!
    expect(depthMinus1.games[0].id).toBe('b')
    const depthMinus2 = result.columns.find(c => c.depth === -2)!
    expect(depthMinus2.games[0].id).toBe('a')
  })

  it('places descendants at positive depths', () => {
    const result = buildLineageData('b', gameMap, links, adjacency)
    const depth1 = result.columns.find(c => c.depth === 1)!
    expect(depth1.games[0].id).toBe('c')
    const depth2 = result.columns.find(c => c.depth === 2)!
    expect(depth2.games[0].id).toBe('d')
  })

  it('collects edges within the lineage', () => {
    const result = buildLineageData('b', gameMap, links, adjacency)
    expect(result.edges).toEqual(
      expect.arrayContaining([
        { from: 'a', to: 'b', through: ['mechanic-x'] },
        { from: 'b', to: 'c', through: ['mechanic-y'] },
        { from: 'c', to: 'd', through: ['mechanic-z'] },
      ])
    )
  })

  it('returns single column for a game with no connections', () => {
    const result = buildLineageData('a', gameMap, buildLinks([games[0]]), buildAdjacency([]))
    expect(result.columns).toHaveLength(1)
    expect(result.columns[0].depth).toBe(0)
    expect(result.edges).toHaveLength(0)
  })

  it('limits ancestor depth when maxDepth is set', () => {
    // Chain: A -> B -> C -> D (selected). maxDepth=1 -> only C as ancestor
    const games = new Map<string, Game>([
      ['a', { id: 'a', title: 'A', date: '1980-01-01', tags: [], influencedBy: [] }],
      ['b', { id: 'b', title: 'B', date: '1985-01-01', tags: [], influencedBy: [{ id: 'a', through: ['t'] }] }],
      ['c', { id: 'c', title: 'C', date: '1990-01-01', tags: [], influencedBy: [{ id: 'b', through: ['t'] }] }],
      ['d', { id: 'd', title: 'D', date: '1995-01-01', tags: [], influencedBy: [{ id: 'c', through: ['t'] }] }],
    ])
    const links = buildLinks([...games.values()])
    const adj = buildAdjacency(links)
    const result = buildLineageData('d', games, links, adj, 1)
    const allIds = result.columns.flatMap(c => c.games.map(g => g.id))
    expect(allIds).toContain('d')
    expect(allIds).toContain('c')
    expect(allIds).not.toContain('b')
    expect(allIds).not.toContain('a')
  })

  it('limits descendant depth when maxDepth is set', () => {
    // Same chain. Selected=A, maxDepth=2 -> B and C included, D excluded
    const games = new Map<string, Game>([
      ['a', { id: 'a', title: 'A', date: '1980-01-01', tags: [], influencedBy: [] }],
      ['b', { id: 'b', title: 'B', date: '1985-01-01', tags: [], influencedBy: [{ id: 'a', through: ['t'] }] }],
      ['c', { id: 'c', title: 'C', date: '1990-01-01', tags: [], influencedBy: [{ id: 'b', through: ['t'] }] }],
      ['d', { id: 'd', title: 'D', date: '1995-01-01', tags: [], influencedBy: [{ id: 'c', through: ['t'] }] }],
    ])
    const links = buildLinks([...games.values()])
    const adj = buildAdjacency(links)
    const result = buildLineageData('a', games, links, adj, 2)
    const allIds = result.columns.flatMap(c => c.games.map(g => g.id))
    expect(allIds).toContain('a')
    expect(allIds).toContain('b')
    expect(allIds).toContain('c')
    expect(allIds).not.toContain('d')
  })

  it('returns full lineage when maxDepth is undefined', () => {
    const games = new Map<string, Game>([
      ['a', { id: 'a', title: 'A', date: '1980-01-01', tags: [], influencedBy: [] }],
      ['b', { id: 'b', title: 'B', date: '1985-01-01', tags: [], influencedBy: [{ id: 'a', through: ['t'] }] }],
      ['c', { id: 'c', title: 'C', date: '1990-01-01', tags: [], influencedBy: [{ id: 'b', through: ['t'] }] }],
    ])
    const links = buildLinks([...games.values()])
    const adj = buildAdjacency(links)
    const result = buildLineageData('c', games, links, adj)
    const allIds = result.columns.flatMap(c => c.games.map(g => g.id))
    expect(allIds).toContain('a')
    expect(allIds).toContain('b')
    expect(allIds).toContain('c')
  })

  it('sorts games within a column by date', () => {
    const diamond: Game[] = [
      makeGame('a', '1990-01-01'),
      makeGame('b', '1998-01-01', [{ id: 'a', through: ['x'] }]),
      makeGame('c', '1995-01-01', [{ id: 'a', through: ['y'] }]),
      makeGame('d', '2005-01-01', [{ id: 'b', through: ['x'] }, { id: 'c', through: ['y'] }]),
    ]
    const dLinks = buildLinks(diamond)
    const dAdj = buildAdjacency(dLinks)
    const dMap = new Map(diamond.map(g => [g.id, g]))
    const result = buildLineageData('d', dMap, dLinks, dAdj)
    const depthMinus1 = result.columns.find(c => c.depth === -1)!
    expect(depthMinus1.games.map(g => g.id)).toEqual(['c', 'b'])
  })
})
