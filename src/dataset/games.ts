import { buildTagIndex, computeNormParamsFromIndex, computeTagPositionsFromIndex, computeTagColorsFromPositions, hslFromPosition } from '../utils/tagColor'
import type { DatasetConfig } from './DatasetConfig'
import type { Entity } from '../types'

export function createGamesDatasetConfig(games: Entity[]): DatasetConfig {
  const { tagIndex, totalTags } = buildTagIndex(games)
  const { min: normMin, range: normRange } = computeNormParamsFromIndex(games, tagIndex, totalTags)
  const tagPositions = computeTagPositionsFromIndex(games, tagIndex, totalTags)
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
    timeRange: { min: 1972, max: 2024 },
  }
}
