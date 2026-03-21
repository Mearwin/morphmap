import { LINE, LABEL } from '../constants'
import { computeControlPoint } from './curve'

export interface LabelInfo {
  x: number
  y: number
  text: string
  width: number
}

/**
 * Compute stroke width based on influence strength (number of shared tags).
 * More tags = thicker line, linearly interpolated between min and max.
 */
export function influenceStrokeWidth(throughCount: number): number {
  const t = Math.min(throughCount, LINE.STROKE_STRENGTH_TAGS_MAX) / LINE.STROKE_STRENGTH_TAGS_MAX
  return LINE.STROKE_STRENGTH_MIN + t * (LINE.STROKE_STRENGTH_MAX - LINE.STROKE_STRENGTH_MIN)
}

export function computeLinkLabel(
  source: { x: number; y: number },
  target: { x: number; y: number },
  through: string[]
): LabelInfo {
  const { midX, controlY } = computeControlPoint(source, target)
  const text = through.join(', ')
  return {
    x: midX,
    y: controlY - LABEL.Y_OFFSET,
    text,
    width: text.length * LABEL.CHAR_WIDTH + LABEL.PADDING,
  }
}
