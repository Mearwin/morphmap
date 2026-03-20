import { computeTagColors, computeTagPositions } from '../utils/tagColor'
import type { DatasetConfig } from './DatasetConfig'
import type { Entity } from '../types'

export function createGamesDatasetConfig(games: Entity[]): DatasetConfig {
  return {
    name: 'Video Games',
    entityLabel: 'game',
    entityLabelPlural: 'games',
    gameColors: computeTagColors(games),
    tagPositions: computeTagPositions(games),
    influenceLabel: 'Influenced by',
    influencedLabel: 'Influenced',
    timeRange: { min: 1972, max: 2024 },
  }
}
