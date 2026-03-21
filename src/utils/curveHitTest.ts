import { computeControlPoint } from './curve'

/**
 * Sample the quadratic Bezier curve and check if (px, py) is within
 * `tolerance` pixels of any sample point.
 */
export function isPointNearCurve(
  px: number,
  py: number,
  source: { x: number; y: number },
  target: { x: number; y: number },
  tolerance: number,
  steps: number = 20,
): boolean {
  const { midX, controlY } = computeControlPoint(source, target)
  const tolSq = tolerance * tolerance

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const invT = 1 - t
    // Quadratic Bezier: B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
    const bx = invT * invT * source.x + 2 * invT * t * midX + t * t * target.x
    const by = invT * invT * source.y + 2 * invT * t * controlY + t * t * target.y
    const dx = px - bx
    const dy = py - by
    if (dx * dx + dy * dy <= tolSq) return true
  }
  return false
}
