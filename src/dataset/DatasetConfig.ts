export interface DatasetConfig {
  /** Human-readable name, e.g. "Video Games" */
  name: string
  /** Singular label for an entity, e.g. "game" */
  entityLabel: string
  /** Plural label, e.g. "games" */
  entityLabelPlural: string
  /** Per-game HSL color derived from tags */
  gameColors: Map<string, string>
  /** Per-game Y-axis position [0, 1] derived from tags */
  tagPositions: Map<string, number>
  /** Spectral tag ordering index (tag name → position in ordered list) */
  tagIndex: Map<string, number>
  /** Total number of unique tags */
  totalTags: number
  /** Normalization params for tag position stretch */
  normMin: number
  normRange: number
  /** Label for the "influenced by" relationship, e.g. "Influenced by" */
  influenceLabel: string
  /** Label for the forward relationship, e.g. "Influenced" */
  influencedLabel: string
  /** Time axis extent for this dataset */
  timeRange: { min: number; max: number }
}
