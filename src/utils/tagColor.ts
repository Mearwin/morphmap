import type { Entity } from '../types'

/**
 * Build a sorted global tag list and index from games.
 * Shared by color and position computations.
 */
function buildTagIndex(games: Entity[]): { tagIndex: Map<string, number>; totalTags: number } {
  const allTags = new Set<string>()
  for (const g of games) for (const t of g.tags) allTags.add(t)
  const sortedTags = [...allTags].sort()
  const tagIndex = new Map(sortedTags.map((t, i) => [t, i]))
  return { tagIndex, totalTags: sortedTags.length }
}

/**
 * Compute a normalized tag position [0, 1] for each game.
 * Average index of its tags in the sorted global tag list.
 */
export function computeTagPositions(games: Entity[]): Map<string, number> {
  const { tagIndex, totalTags } = buildTagIndex(games)

  const positions = new Map<string, number>()
  for (const g of games) {
    const indices = g.tags.map(t => tagIndex.get(t)!).filter(i => i !== undefined)
    const avg = indices.length > 0
      ? indices.reduce((a, b) => a + b, 0) / indices.length
      : 0
    positions.set(g.id, totalTags > 0 ? avg / totalTags : 0)
  }
  return positions
}

/**
 * Get the HSL color string for a given normalized position [0, 1].
 */
export function hslFromPosition(position: number): string {
  const hue = Math.round(position * 360)
  return `hsl(${hue}, 70%, 55%)`
}

/**
 * Compute a deterministic HSL color for each game based on its tags.
 * Games sharing tags get similar hues.
 */
export function computeTagColors(games: Entity[]): Map<string, string> {
  const positions = computeTagPositions(games)
  const colors = new Map<string, string>()
  for (const [id, pos] of positions) {
    colors.set(id, hslFromPosition(pos))
  }
  return colors
}
