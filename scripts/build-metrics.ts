import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Types

interface GameFile {
  id: string
  title: string
  date: string
  tags: string[]
  influencedBy: { id: string; through: string[] }[]
}

interface LinkData {
  source: string
  target: string
  through: string[]
}

interface Adjacency {
  forward: Map<string, Set<string>>
  reverse: Map<string, Set<string>>
}

export interface DecadeMetrics {
  mostInfluential: { id: string; title: string; descendants: number }
  mostDerivative: { id: string; title: string; ancestors: number }
}

export interface CrossGenreEntry {
  id: string
  title: string
  uniqueTagsSpanned: number
  tags: string[]
}

export interface DensestHubEntry {
  id: string
  title: string
  decade: number
  connectionRatio: number
  connections: number
  contemporaries: number
}

export interface ClusterEntry {
  hub: { id: string; title: string }
  games: { id: string; title: string }[]
  density: number
  internalLinks: number
}

export interface UnexpectedConnectionEntry {
  source: { id: string; title: string }
  target: { id: string; title: string }
  pathLength: number
  sharedTags: number
}

export interface MetricsData {
  perDecade: Record<string, DecadeMetrics>
  crossGenre: CrossGenreEntry[]
  densestHubs: DensestHubEntry[]
  clusters: ClusterEntry[]
  unexpectedConnections: UnexpectedConnectionEntry[]
}

// Graph helpers (inlined — can't import from src/utils in a build script)

function buildLinks(games: GameFile[]): LinkData[] {
  const gameIds = new Set(games.map(g => g.id))
  const links: LinkData[] = []
  for (const game of games) {
    for (const inf of game.influencedBy) {
      if (gameIds.has(inf.id)) {
        links.push({ source: inf.id, target: game.id, through: inf.through })
      }
    }
  }
  return links
}

function buildAdjacency(links: LinkData[]): Adjacency {
  const forward = new Map<string, Set<string>>()
  const reverse = new Map<string, Set<string>>()
  for (const link of links) {
    if (!forward.has(link.source)) forward.set(link.source, new Set())
    forward.get(link.source)!.add(link.target)
    if (!reverse.has(link.target)) reverse.set(link.target, new Set())
    reverse.get(link.target)!.add(link.source)
  }
  return { forward, reverse }
}

function getDescendants(gameId: string, adj: Adjacency): Set<string> {
  const descendants = new Set<string>()
  const queue = [gameId]
  while (queue.length > 0) {
    const current = queue.pop()!
    for (const target of adj.forward.get(current) ?? []) {
      if (!descendants.has(target)) {
        descendants.add(target)
        queue.push(target)
      }
    }
  }
  return descendants
}

function getAncestors(gameId: string, adj: Adjacency): Set<string> {
  const ancestors = new Set<string>()
  const queue = [gameId]
  while (queue.length > 0) {
    const current = queue.pop()!
    for (const source of adj.reverse.get(current) ?? []) {
      if (!ancestors.has(source)) {
        ancestors.add(source)
        queue.push(source)
      }
    }
  }
  return ancestors
}

function bfsDistance(fromId: string, toId: string, adj: Adjacency): number {
  if (fromId === toId) return 0
  const visited = new Set<string>([fromId])
  const queue: [string, number][] = [[fromId, 0]]
  while (queue.length > 0) {
    const [current, dist] = queue.shift()!
    for (const next of adj.forward.get(current) ?? []) {
      if (next === toId) return dist + 1
      if (!visited.has(next)) {
        visited.add(next)
        queue.push([next, dist + 1])
      }
    }
    for (const next of adj.reverse.get(current) ?? []) {
      if (next === toId) return dist + 1
      if (!visited.has(next)) {
        visited.add(next)
        queue.push([next, dist + 1])
      }
    }
  }
  return -1
}

// Metric computations

export function computePerDecade(
  games: GameFile[],
  adj: Adjacency,
): Record<string, DecadeMetrics> {
  const decades = new Map<string, GameFile[]>()
  for (const g of games) {
    const decade = String(Math.floor(parseInt(g.date.slice(0, 4)) / 10) * 10)
    if (!decades.has(decade)) decades.set(decade, [])
    decades.get(decade)!.push(g)
  }

  const result: Record<string, DecadeMetrics> = {}
  for (const [decade, decadeGames] of decades) {
    let bestInfluential = decadeGames[0]
    let bestInfluentialCount = 0
    let bestDerivative = decadeGames[0]
    let bestDerivativeCount = 0

    for (const g of decadeGames) {
      const descCount = getDescendants(g.id, adj).size
      if (descCount > bestInfluentialCount) {
        bestInfluentialCount = descCount
        bestInfluential = g
      }
      const ancCount = getAncestors(g.id, adj).size
      if (ancCount > bestDerivativeCount) {
        bestDerivativeCount = ancCount
        bestDerivative = g
      }
    }

    result[decade] = {
      mostInfluential: {
        id: bestInfluential.id,
        title: bestInfluential.title,
        descendants: bestInfluentialCount,
      },
      mostDerivative: {
        id: bestDerivative.id,
        title: bestDerivative.title,
        ancestors: bestDerivativeCount,
      },
    }
  }

  return result
}

export function computeCrossGenre(
  games: GameFile[],
  links: LinkData[],
): CrossGenreEntry[] {
  const gameMap = new Map(games.map(g => [g.id, g]))

  // For each game, collect unique tags from its own tags + through tags from all its direct connections
  const entries: CrossGenreEntry[] = games.map(game => {
    const tagSet = new Set(game.tags)

    // Add through tags from links where this game is source or target
    for (const link of links) {
      if (link.source === game.id || link.target === game.id) {
        for (const t of link.through) tagSet.add(t)
        // Also add tags from the connected game
        const otherId = link.source === game.id ? link.target : link.source
        const other = gameMap.get(otherId)
        if (other) {
          for (const t of other.tags) tagSet.add(t)
        }
      }
    }

    return {
      id: game.id,
      title: game.title,
      uniqueTagsSpanned: tagSet.size,
      tags: [...tagSet].sort(),
    }
  })

  entries.sort((a, b) => b.uniqueTagsSpanned - a.uniqueTagsSpanned)
  return entries.slice(0, 5)
}

export function computeDensestHubs(
  games: GameFile[],
  links: LinkData[],
): DensestHubEntry[] {
  const gameDecade = new Map<string, number>()
  const decadeCounts = new Map<number, number>()

  for (const g of games) {
    const decade = Math.floor(parseInt(g.date.slice(0, 4)) / 10) * 10
    gameDecade.set(g.id, decade)
    decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1)
  }

  const entries: DensestHubEntry[] = []
  for (const g of games) {
    const decade = gameDecade.get(g.id)!
    const contemporaries = decadeCounts.get(decade)!
    if (contemporaries <= 1) continue

    let connections = 0
    for (const link of links) {
      const srcDecade = gameDecade.get(link.source)
      const tgtDecade = gameDecade.get(link.target)
      if (
        (link.source === g.id || link.target === g.id) &&
        srcDecade === decade &&
        tgtDecade === decade
      ) {
        connections++
      }
    }

    if (connections > 0) {
      entries.push({
        id: g.id,
        title: g.title,
        decade,
        connectionRatio: Math.round((connections / (contemporaries - 1)) * 100) / 100,
        connections,
        contemporaries,
      })
    }
  }

  entries.sort((a, b) => b.connectionRatio - a.connectionRatio || b.connections - a.connections)
  return entries.slice(0, 5)
}

export function computeClusters(
  games: GameFile[],
  links: LinkData[],
): ClusterEntry[] {
  const gameMap = new Map(games.map(g => [g.id, g]))

  // Build bidirectional neighbor map (direct connections only)
  const neighbors = new Map<string, Set<string>>()
  for (const g of games) neighbors.set(g.id, new Set())
  for (const link of links) {
    neighbors.get(link.source)?.add(link.target)
    neighbors.get(link.target)?.add(link.source)
  }

  // For each game with >= 3 neighbors, compute density of its neighborhood
  // Density = actual edges among neighbors / possible edges among neighbors
  const candidates: ClusterEntry[] = []
  for (const game of games) {
    const nbrs = neighbors.get(game.id)!
    if (nbrs.size < 3) continue

    const group = [game.id, ...nbrs]
    const groupSet = new Set(group)

    // Count edges within this group
    let internalLinks = 0
    for (const link of links) {
      if (groupSet.has(link.source) && groupSet.has(link.target)) {
        internalLinks++
      }
    }

    // Possible edges in a group of n = n*(n-1)/2 (undirected)
    const n = group.length
    const possibleEdges = (n * (n - 1)) / 2
    const density = Math.round((internalLinks / possibleEdges) * 100) / 100

    candidates.push({
      hub: { id: game.id, title: game.title },
      games: group.map(id => ({ id, title: gameMap.get(id)!.title })),
      density,
      internalLinks,
    })
  }

  // Sort by density (higher = tighter), then by group size
  candidates.sort((a, b) => b.density - a.density || b.games.length - a.games.length)

  // Deduplicate: skip clusters whose games are a subset of an already-picked one
  const picked: ClusterEntry[] = []
  for (const candidate of candidates) {
    const candidateIds = new Set(candidate.games.map(g => g.id))
    const isSubset = picked.some(p => {
      const pIds = new Set(p.games.map(g => g.id))
      return [...candidateIds].every(id => pIds.has(id))
    })
    if (!isSubset) {
      picked.push(candidate)
      if (picked.length >= 5) break
    }
  }

  return picked
}

export function computeUnexpectedConnections(
  games: GameFile[],
  adj: Adjacency,
): UnexpectedConnectionEntry[] {
  const gameMap = new Map(games.map(g => [g.id, g]))
  const entries: UnexpectedConnectionEntry[] = []

  // Check all pairs where one is an ancestor/descendant of the other
  for (const game of games) {
    const descendants = getDescendants(game.id, adj)
    for (const descId of descendants) {
      const desc = gameMap.get(descId)!
      const shared = game.tags.filter(t => desc.tags.includes(t))
      if (shared.length === 0) {
        const pathLen = bfsDistance(game.id, descId, adj)
        if (pathLen > 0) {
          entries.push({
            source: { id: game.id, title: game.title },
            target: { id: desc.id, title: desc.title },
            pathLength: pathLen,
            sharedTags: 0,
          })
        }
      }
    }
  }

  // Sort by path length (shorter = more surprising), then alphabetically
  entries.sort((a, b) => a.pathLength - b.pathLength || a.source.id.localeCompare(b.source.id))
  return entries.slice(0, 5)
}

export function buildMetrics(games: GameFile[]): MetricsData {
  const links = buildLinks(games)
  const adj = buildAdjacency(links)

  return {
    perDecade: computePerDecade(games, adj),
    crossGenre: computeCrossGenre(games, links),
    densestHubs: computeDensestHubs(games, links),
    clusters: computeClusters(games, links),
    unexpectedConnections: computeUnexpectedConnections(games, adj),
  }
}

// CLI entry point
const isMain =
  process.argv[1]?.endsWith('build-metrics.ts') ||
  process.argv[1]?.endsWith('build-metrics.js')

if (isMain) {
  const gamesPath = join(import.meta.dirname, '..', 'src', 'data', 'games.json')
  const outPath = join(import.meta.dirname, '..', 'src', 'data', 'metrics.json')

  const raw = readFileSync(gamesPath, 'utf-8')
  const games: GameFile[] = JSON.parse(raw)

  const metrics = buildMetrics(games)
  writeFileSync(outPath, JSON.stringify(metrics, null, 2) + '\n')

  const decadeCount = Object.keys(metrics.perDecade).length
  console.log(
    `✓ Built metrics: ${decadeCount} decades, ${metrics.crossGenre.length} cross-genre, ` +
    `${metrics.densestHubs.length} hubs, ${metrics.clusters.length} clusters, ` +
    `${metrics.unexpectedConnections.length} unexpected connections → src/data/metrics.json`
  )
}
