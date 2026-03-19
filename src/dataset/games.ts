import { computeTagColors, computeTagPositions } from '../utils/tagColor'
import { TAG_CATEGORIES, TAG_COLORS } from '../data/categories'
import type { DatasetConfig } from './DatasetConfig'
import type { Entity } from '../types'

export function createGamesDatasetConfig(games: Entity[]): DatasetConfig {
  return {
    name: 'Video Games',
    entityLabel: 'game',
    entityLabelPlural: 'games',
    gameColors: computeTagColors(games),
    tagPositions: computeTagPositions(games),
    categories: TAG_CATEGORIES,
    categoryColors: TAG_COLORS,
    influenceLabel: 'Influenced by',
    influencedLabel: 'Influenced',
    timeRange: { min: 1972, max: 2024 },
  }
}

/** @deprecated Use createGamesDatasetConfig instead */
export const gamesDatasetConfig: DatasetConfig = {
  name: 'Video Games',
  entityLabel: 'game',
  entityLabelPlural: 'games',
  gameColors: new Map(),
  tagPositions: new Map(),
  categories: TAG_CATEGORIES,
  categoryColors: TAG_COLORS,
  influenceLabel: 'Influenced by',
  influencedLabel: 'Influenced',
  timeRange: { min: 1972, max: 2024 },
}
