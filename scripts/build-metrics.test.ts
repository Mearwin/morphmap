import { describe, it, expect } from 'vitest'
import {
  buildMetrics,
  computePerDecade,
  computeCrossGenre,
  computeDensestHubs,
  computeClusters,
  computeUnexpectedConnections,
} from './build-metrics'

interface TestGame {
  id: string
  title: string
  date: string
  tags: string[]
  influencedBy: { id: string; through: string[] }[]
}

const games: TestGame[] = [
  { id: 'pong', title: 'Pong', date: '1972-11-29', tags: ['arcade', 'sports'], influencedBy: [] },
  { id: 'space-invaders', title: 'Space Invaders', date: '1978-06-01', tags: ['arcade', 'shooter'], influencedBy: [{ id: 'pong', through: ['arcade'] }] },
  { id: 'pac-man', title: 'Pac-Man', date: '1980-05-22', tags: ['arcade', 'maze'], influencedBy: [{ id: 'pong', through: ['arcade'] }] },
  { id: 'mario', title: 'Super Mario Bros.', date: '1985-09-13', tags: ['platformer', 'arcade'], influencedBy: [{ id: 'pac-man', through: ['arcade'] }] },
  { id: 'zelda', title: 'The Legend of Zelda', date: '1986-02-21', tags: ['action-adventure', 'rpg'], influencedBy: [] },
  { id: 'doom', title: 'Doom', date: '1993-12-10', tags: ['fps', 'shooter'], influencedBy: [{ id: 'space-invaders', through: ['shooter'] }] },
  { id: 'quake', title: 'Quake', date: '1996-06-22', tags: ['fps', 'shooter', 'multiplayer'], influencedBy: [{ id: 'doom', through: ['fps', 'shooter'] }] },
  { id: 'half-life', title: 'Half-Life', date: '1998-11-19', tags: ['fps', 'shooter', 'narrative'], influencedBy: [{ id: 'doom', through: ['fps', 'shooter'] }, { id: 'quake', through: ['fps'] }] },
  { id: 'dark-souls', title: 'Dark Souls', date: '2011-09-22', tags: ['action-rpg', 'difficult'], influencedBy: [{ id: 'zelda', through: ['action-rpg'] }] },
  { id: 'elden-ring', title: 'Elden Ring', date: '2022-02-25', tags: ['action-rpg', 'open-world'], influencedBy: [{ id: 'dark-souls', through: ['action-rpg'] }, { id: 'zelda', through: ['action-rpg'] }] },
]

function buildAdj() {
  const links: { source: string; target: string; through: string[] }[] = []
  const gameIds = new Set(games.map(g => g.id))
  for (const g of games) {
    for (const inf of g.influencedBy) {
      if (gameIds.has(inf.id)) {
        links.push({ source: inf.id, target: g.id, through: inf.through })
      }
    }
  }
  const forward = new Map<string, Set<string>>()
  const reverse = new Map<string, Set<string>>()
  for (const link of links) {
    if (!forward.has(link.source)) forward.set(link.source, new Set())
    forward.get(link.source)!.add(link.target)
    if (!reverse.has(link.target)) reverse.set(link.target, new Set())
    reverse.get(link.target)!.add(link.source)
  }
  return { adj: { forward, reverse }, links }
}

describe('computePerDecade', () => {
  it('finds most influential and derivative per decade', () => {
    const { adj } = buildAdj()
    const result = computePerDecade(games, adj)

    expect(result['1970']).toBeDefined()
    expect(result['1970'].mostInfluential.id).toBe('pong')
    expect(result['1970'].mostInfluential.descendants).toBeGreaterThan(0)

    expect(result['1990']).toBeDefined()
    expect(result['1990'].mostInfluential.id).toBe('doom')
  })

  it('covers all decades present in data', () => {
    const { adj } = buildAdj()
    const result = computePerDecade(games, adj)
    const decades = Object.keys(result).sort()
    expect(decades).toEqual(['1970', '1980', '1990', '2010', '2020'])
  })
})

describe('computeCrossGenre', () => {
  it('returns top 5 entries sorted by unique tags', () => {
    const { links } = buildAdj()
    const result = computeCrossGenre(games, links)
    expect(result.length).toBeLessThanOrEqual(5)
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].uniqueTagsSpanned).toBeGreaterThanOrEqual(result[i].uniqueTagsSpanned)
    }
  })

  it('counts tags from direct connections only', () => {
    const { links } = buildAdj()
    const result = computeCrossGenre(games, links)
    // Each entry should have reasonable tag count (not hundreds)
    for (const entry of result) {
      expect(entry.uniqueTagsSpanned).toBeLessThan(20)
      expect(entry.tags.length).toBe(entry.uniqueTagsSpanned)
    }
  })
})

describe('computeDensestHubs', () => {
  it('returns entries with valid ratios', () => {
    const { links } = buildAdj()
    const result = computeDensestHubs(games, links)
    for (const entry of result) {
      expect(entry.connectionRatio).toBeGreaterThan(0)
      expect(entry.connectionRatio).toBeLessThanOrEqual(1)
      expect(entry.connections).toBeGreaterThan(0)
      expect(entry.contemporaries).toBeGreaterThan(1)
    }
  })

  it('finds doom/quake/half-life in 1990s', () => {
    const { links } = buildAdj()
    const result = computeDensestHubs(games, links)
    const nineties = result.filter(e => e.decade === 1990)
    expect(nineties.length).toBeGreaterThan(0)
  })
})

describe('computeClusters', () => {
  it('finds connected components with >= 3 games', () => {
    const { links } = buildAdj()
    const result = computeClusters(games, links)
    for (const cluster of result) {
      expect(cluster.games.length).toBeGreaterThanOrEqual(3)
      expect(cluster.internalLinks).toBeGreaterThan(0)
    }
  })

  it('returns clusters sorted by size', () => {
    const { links } = buildAdj()
    const result = computeClusters(games, links)
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].games.length).toBeGreaterThanOrEqual(result[i].games.length)
    }
  })
})

describe('computeUnexpectedConnections', () => {
  it('returns pairs with zero shared tags', () => {
    const { adj } = buildAdj()
    const result = computeUnexpectedConnections(games, adj)
    for (const entry of result) {
      expect(entry.sharedTags).toBe(0)
      expect(entry.pathLength).toBeGreaterThan(0)
    }
  })

  it('returns at most 5 entries', () => {
    const { adj } = buildAdj()
    const result = computeUnexpectedConnections(games, adj)
    expect(result.length).toBeLessThanOrEqual(5)
  })
})

describe('buildMetrics', () => {
  it('produces complete metrics data', () => {
    const result = buildMetrics(games)
    expect(result.perDecade).toBeDefined()
    expect(result.crossGenre).toBeDefined()
    expect(result.densestHubs).toBeDefined()
    expect(result.clusters).toBeDefined()
    expect(result.unexpectedConnections).toBeDefined()
    expect(Object.keys(result.perDecade).length).toBeGreaterThan(0)
  })
})
