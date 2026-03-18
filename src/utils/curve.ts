import { LINE } from '../constants'

export interface CurvePoint {
  midX: number
  controlY: number
}

/**
 * Compute the quadratic Bezier control point for an influence curve
 * between two nodes. Returns the midpoint X and the control point Y.
 *
 * The curve bows away from the midline proportional to the horizontal
 * distance, capped at a maximum magnitude.
 */
export function computeControlPoint(
  source: { x: number; y: number },
  target: { x: number; y: number },
  curveFactor: number = LINE.CURVE_FACTOR,
  curveMax: number = LINE.CURVE_MAX,
): CurvePoint {
  const midX = (source.x + target.x) / 2
  const dx = Math.abs(target.x - source.x)
  const curveMagnitude = Math.min(dx * curveFactor, curveMax)
  const curveUp = source.y > target.y ? -1 : 1
  const controlY = (source.y + target.y) / 2 + curveUp * curveMagnitude
  return { midX, controlY }
}

/**
 * Build an SVG quadratic Bezier path string for an influence curve.
 */
export function curvePath(
  source: { x: number; y: number },
  target: { x: number; y: number },
  curveFactor?: number,
  curveMax?: number,
): string {
  const { midX, controlY } = computeControlPoint(source, target, curveFactor, curveMax)
  return `M ${source.x},${source.y} Q ${midX},${controlY} ${target.x},${target.y}`
}
