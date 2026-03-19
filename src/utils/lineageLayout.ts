import type { Game, Link } from '../types'
import type { Adjacency } from './graph'

export interface LineageColumn {
  depth: number
  games: Game[]
}

export interface LineageEdge {
  from: string
  to: string
  through: string[]
}

export interface LineageData {
  columns: LineageColumn[]
  edges: LineageEdge[]
  selectedId: string
}

/**
 * BFS from selectedId through the given direction map,
 * assigning each node a depth (distance from selected).
 */
function bfsDepths(
  selectedId: string,
  directionMap: Map<string, Set<string>>,
  sign: 1 | -1,
  maxDepth?: number,
): Map<string, number> {
  const depths = new Map<string, number>()
  const queue: [string, number][] = [[selectedId, 0]]
  const visited = new Set<string>([selectedId])

  while (queue.length > 0) {
    const [current, depth] = queue.shift()!
    for (const neighbor of directionMap.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        const neighborDepth = depth + sign
        depths.set(neighbor, neighborDepth)
        if (maxDepth === undefined || Math.abs(neighborDepth) < maxDepth) {
          queue.push([neighbor, neighborDepth])
        }
      }
    }
  }
  return depths
}

export function buildLineageData(
  selectedId: string,
  gameMap: Map<string, Game>,
  links: Link[],
  adjacency: Adjacency,
  maxDepth?: number,
): LineageData {
  const ancestorDepths = bfsDepths(selectedId, adjacency.reverse, -1, maxDepth)
  const descendantDepths = bfsDepths(selectedId, adjacency.forward, 1, maxDepth)

  const allDepths = new Map<string, number>([[selectedId, 0]])
  for (const [id, depth] of ancestorDepths) allDepths.set(id, depth)
  for (const [id, depth] of descendantDepths) allDepths.set(id, depth)

  const depthGroups = new Map<number, Game[]>()
  for (const [id, depth] of allDepths) {
    const game = gameMap.get(id)
    if (!game) continue
    if (!depthGroups.has(depth)) depthGroups.set(depth, [])
    depthGroups.get(depth)!.push(game)
  }

  for (const games of depthGroups.values()) {
    games.sort((a, b) => a.date.localeCompare(b.date))
  }

  const columns: LineageColumn[] = [...depthGroups.entries()]
    .map(([depth, games]) => ({ depth, games }))
    .sort((a, b) => a.depth - b.depth)

  const lineageIds = new Set(allDepths.keys())
  const edges: LineageEdge[] = links
    .filter(l => lineageIds.has(l.source) && lineageIds.has(l.target))
    .map(l => ({ from: l.source, to: l.target, through: l.through }))

  return { columns, edges, selectedId }
}
