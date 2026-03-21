import { type Entity, type Link } from '../types'

export type Adjacency = {
  forward: Map<string, Set<string>>  // source -> targets
  reverse: Map<string, Set<string>>  // target -> sources
}

export function buildLinks(games: Entity[]): Link[] {
  const gameIds = new Set(games.map(g => g.id))
  const links: Link[] = []
  for (const game of games) {
    for (const inf of game.influencedBy) {
      if (gameIds.has(inf.id)) {
        links.push({ source: inf.id, target: game.id, through: inf.through })
      }
    }
  }
  return links
}

export function buildAdjacency(links: Link[]): Adjacency {
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

export function getAncestors(gameId: string, links: Link[], adj?: Adjacency, maxDepth?: number): Set<string> {
  const { reverse } = adj ?? buildAdjacency(links)
  const ancestors = new Set<string>()
  const queue: [string, number][] = [[gameId, 0]]
  while (queue.length > 0) {
    const [current, depth] = queue.shift()!
    if (maxDepth !== undefined && depth >= maxDepth) continue
    for (const source of reverse.get(current) ?? []) {
      if (!ancestors.has(source)) {
        ancestors.add(source)
        queue.push([source, depth + 1])
      }
    }
  }
  return ancestors
}

export function getDescendants(gameId: string, links: Link[], adj?: Adjacency, maxDepth?: number): Set<string> {
  const { forward } = adj ?? buildAdjacency(links)
  const descendants = new Set<string>()
  const queue: [string, number][] = [[gameId, 0]]
  while (queue.length > 0) {
    const [current, depth] = queue.shift()!
    if (maxDepth !== undefined && depth >= maxDepth) continue
    for (const target of forward.get(current) ?? []) {
      if (!descendants.has(target)) {
        descendants.add(target)
        queue.push([target, depth + 1])
      }
    }
  }
  return descendants
}

export function getAllTags(games: Entity[]): string[] {
  const tagSet = new Set<string>()
  for (const game of games) {
    for (const tag of game.tags) tagSet.add(tag)
    for (const inf of game.influencedBy) {
      for (const t of inf.through) tagSet.add(t)
    }
  }
  return [...tagSet].sort()
}

