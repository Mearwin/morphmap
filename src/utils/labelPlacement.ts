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

const PASSES = 4

/**
 * Resolve overlapping labels using a sweep-line approach.
 *
 * Labels are sorted by x-position. For each label, we only check forward
 * neighbors that could possibly overlap on the x-axis (breaking early when
 * the next label's left edge is past our right edge). This reduces the
 * inner loop from O(n) to O(k) where k is the number of x-overlapping
 * neighbors — typically 1-3 for spread-out link labels.
 *
 * Multiple passes ensure cascading overlaps get resolved.
 */
export function resolveOverlaps(labels: LabelInfo[]): LabelInfo[] {
  if (labels.length <= 1) return labels

  const resolved = labels.map(l => ({ ...l }))

  for (let pass = 0; pass < PASSES; pass++) {
    // Re-sort each pass since y-positions change
    resolved.sort((a, b) => a.x - b.x || a.y - b.y)

    for (let i = 0; i < resolved.length; i++) {
      const a = resolved[i]
      const aRight = a.x + a.width / 2 + LABEL.GAP

      for (let j = i + 1; j < resolved.length; j++) {
        const b = resolved[j]
        const bLeft = b.x - b.width / 2

        // Sweep-line early exit: if b's left edge is past a's right edge,
        // no further labels (sorted by x) can overlap with a
        if (bLeft > aRight) break

        const overlapX = (a.width / 2 + b.width / 2 + LABEL.GAP) - Math.abs(a.x - b.x)
        const overlapY = LABEL.HEIGHT - Math.abs(a.y - b.y)

        if (overlapX > 0 && overlapY > 0) {
          // Push labels apart vertically, with a slight bias to push the
          // lower-indexed label up and higher-indexed down for stability
          const pushY = overlapY / 2 + 1
          if (a.y <= b.y) {
            a.y -= pushY
            b.y += pushY
          } else {
            a.y += pushY
            b.y -= pushY
          }
        }
      }
    }
  }

  return resolved
}
