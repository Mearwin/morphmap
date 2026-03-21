// Force simulation config
export const FORCE = {
  X_STRENGTH: 0.8,
  Y_STRENGTH: 0.8,
  COLLIDE_PADDING: 3,
  COLLIDE_STRENGTH: 0.7,
  CHARGE_STRENGTH: -20,
  CHARGE_DISTANCE_MAX: 80,
  ALPHA_DECAY: 0.02,
} as const

// Timeline scale / layout
export const TIMELINE = {
  SCALE_PADDING: 100,
  DATE_PAD_DAYS: 365,
  TAG_Y_PADDING: 10,
  WIDTH_MULTIPLIER: 5,
  HEIGHT_MULTIPLIER: 2,
  ZOOM_MIN: 0.2,
  ZOOM_MAX: 5,
  CANVAS_THRESHOLD: 400,
} as const

// Node rendering
export const NODE = {
  RADIUS: 6,
  SELECTED_SCALE: 1.8,
  STROKE_DEFAULT: 1,
  STROKE_SELECTED: 2,
  LABEL_OFFSET: -4,
  FONT_SIZE_DEFAULT: '9',
  FONT_SIZE_SELECTED: '12',
  FONT_WEIGHT_DEFAULT: '400',
  FONT_WEIGHT_SELECTED: '600',
} as const

// Influence line rendering
export const LINE = {
  CURVE_FACTOR: 0.25,
  CURVE_MAX: 100,
  OPACITY_DEFAULT: 0.12,
  OPACITY_HIGHLIGHTED: 0.6,
  OPACITY_DIMMED: 0.03,
  STROKE_DEFAULT: 1,
  STROKE_HIGHLIGHTED: 2,
  STROKE_STRENGTH_MIN: 0.5,
  STROKE_STRENGTH_MAX: 3.5,
  STROKE_STRENGTH_TAGS_MAX: 5,
} as const

// Link label rendering
export const LABEL = {
  HEIGHT: 18,
  GAP: 6,
  CHAR_WIDTH: 5.6,
  PADDING: 12,
  OVERLAP_PASSES: 5,
  Y_OFFSET: 12,
  PILL_HALF_HEIGHT: 9,
  PILL_RADIUS: 4,
  PILL_STROKE_WIDTH: 0.5,
  PILL_OPACITY: 0.95,
  FONT_SIZE: '10',
  FONT_WEIGHT: '500',
  TEXT_Y_OFFSET: 4,
} as const

// Theme colors — single source of truth for CSS vars and Canvas rendering
export const THEME = {
  bg: '#0a0a0f',
  surface: '#12121a',
  text: '#e0e0e8',
  textMuted: '#6b6b80',
  accent: '#6366f1',
  accentDim: 'rgba(99, 102, 241, 0.3)',
  border: '#1e1e2e',
} as const

// Minimap rendering
export const MINIMAP = {
  WIDTH: 180,
  HEIGHT: 100,
  PAD: 12,
  BORDER_RADIUS: 6,
} as const
