import type { TagCategory } from '../types'

export interface DatasetConfig {
  /** Human-readable name, e.g. "Video Games" */
  name: string
  /** Singular label for an entity, e.g. "game" */
  entityLabel: string
  /** Plural label, e.g. "games" */
  entityLabelPlural: string
  /** Category taxonomy for primaryTag grouping */
  categories: TagCategory[]
  /** Category id -> hex color lookup (derived from categories) */
  categoryColors: Record<string, string>
  /** Label for the "influenced by" relationship, e.g. "Influenced by" */
  influenceLabel: string
  /** Label for the forward relationship, e.g. "Influenced" */
  influencedLabel: string
  /** Time axis extent for this dataset */
  timeRange: { min: number; max: number }
  /** Per-entity color lookup (computed from tags). Optional — falls back to categoryColors[primaryTag] */
  gameColors: Map<string, string>
  /** Per-entity normalized tag position [0,1]. Optional — used for layout hinting */
  tagPositions: Map<string, number>
}
