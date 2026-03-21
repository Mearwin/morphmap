import { buildTagIndex, computeNormParamsFromIndex, computeTagPositionsFromIndex, computeTagColorsFromPositions } from '../utils/tagColor'
import type { DatasetConfig } from './DatasetConfig'
import type { Entity } from '../types'

export interface PrecomputedTagIndex {
  orderedTags: string[]
  normMin: number
  normRange: number
  tagPositions: Record<string, number>
}

export function createGamesDatasetConfig(games: Entity[], precomputed?: PrecomputedTagIndex): DatasetConfig {
  let tagIndex: Map<string, number>
  let totalTags: number
  let normMin: number
  let normRange: number
  let tagPositions: Map<string, number>

  if (precomputed) {
    tagIndex = new Map(precomputed.orderedTags.map((t, i) => [t, i]))
    totalTags = precomputed.orderedTags.length
    normMin = precomputed.normMin
    normRange = precomputed.normRange
    tagPositions = new Map(Object.entries(precomputed.tagPositions))
  } else {
    const idx = buildTagIndex(games)
    tagIndex = idx.tagIndex
    totalTags = idx.totalTags
    const norm = computeNormParamsFromIndex(games, tagIndex, totalTags)
    normMin = norm.min
    normRange = norm.range
    tagPositions = computeTagPositionsFromIndex(games, tagIndex, totalTags)
  }

  const gameColors = computeTagColorsFromPositions(tagPositions)

  return {
    name: 'Video Games',
    entityLabel: 'game',
    entityLabelPlural: 'games',
    gameColors,
    tagPositions,
    tagIndex,
    totalTags,
    normMin,
    normRange,
    influenceLabel: 'Influenced by',
    influencedLabel: 'Influenced',
    timeRange: {
      min: Math.min(...games.map(g => parseInt(g.date.slice(0, 4)))),
      max: Math.max(...games.map(g => parseInt(g.date.slice(0, 4)))),
    },
  }
}
