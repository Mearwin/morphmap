import { describe, it, expect } from 'vitest'
import { isPointNearCurve } from './curveHitTest'

describe('isPointNearCurve', () => {
  const source = { x: 0, y: 0 }
  const target = { x: 200, y: 0 }
  // Curve midpoint is at (100, 25) due to curve bow

  it('returns true for a point on the curve midpoint', () => {
    expect(isPointNearCurve(100, 25, source, target, 5)).toBe(true)
  })

  it('returns false for a point far from the curve', () => {
    expect(isPointNearCurve(100, 100, source, target, 5)).toBe(false)
  })

  it('returns true for a point within tolerance of the curve', () => {
    expect(isPointNearCurve(100, 29, source, target, 5)).toBe(true)
  })

  it('returns false just outside tolerance', () => {
    expect(isPointNearCurve(100, 50, source, target, 5)).toBe(false)
  })

  it('works with curved paths (different y positions)', () => {
    const src = { x: 0, y: 0 }
    const tgt = { x: 400, y: 200 }
    // Curve midpoint is at (200, 150)
    expect(isPointNearCurve(200, 150, src, tgt, 10)).toBe(true)
  })
})
