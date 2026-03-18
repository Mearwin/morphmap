import { describe, it, expect } from 'vitest'
import { computeControlPoint, curvePath } from './curve'
import { LINE } from '../constants'

describe('computeControlPoint', () => {
  it('places midX at the horizontal center of source and target', () => {
    const { midX } = computeControlPoint({ x: 100, y: 50 }, { x: 300, y: 50 })
    expect(midX).toBe(200)
  })

  it('bows upward when source is below target', () => {
    const { controlY } = computeControlPoint({ x: 0, y: 200 }, { x: 100, y: 100 })
    // midY = 150, curve direction = -1 (upward), so controlY < 150
    expect(controlY).toBeLessThan(150)
  })

  it('bows downward when source is above target', () => {
    const { controlY } = computeControlPoint({ x: 0, y: 100 }, { x: 100, y: 200 })
    // midY = 150, curve direction = +1 (downward), so controlY > 150
    expect(controlY).toBeGreaterThan(150)
  })

  it('caps curve magnitude at curveMax', () => {
    // Very large horizontal distance
    const { controlY: capped } = computeControlPoint(
      { x: 0, y: 0 },
      { x: 10000, y: 0 },
    )
    // midY = 0, max magnitude = LINE.CURVE_MAX
    // With source.y === target.y, curveUp is -1 (0 > 0 is false, so +1 actually)
    // curveUp = source.y > target.y ? -1 : 1 => 1
    expect(Math.abs(capped)).toBe(LINE.CURVE_MAX)
  })

  it('uses default constants from LINE', () => {
    const source = { x: 0, y: 0 }
    const target = { x: 200, y: 0 }
    const { controlY } = computeControlPoint(source, target)
    // dx = 200, magnitude = min(200 * 0.25, 100) = 50, curveUp = 1
    expect(controlY).toBe(50)
  })

  it('accepts custom curveFactor and curveMax', () => {
    const source = { x: 0, y: 0 }
    const target = { x: 200, y: 0 }
    const { controlY } = computeControlPoint(source, target, 0.2, 60)
    // dx = 200, magnitude = min(200 * 0.2, 60) = 40, curveUp = 1
    expect(controlY).toBe(40)
  })
})

describe('curvePath', () => {
  it('returns a valid SVG quadratic Bezier path', () => {
    const path = curvePath({ x: 10, y: 20 }, { x: 30, y: 40 })
    expect(path).toMatch(/^M 10,20 Q \d+,/)
    expect(path).toContain('30,40')
  })

  it('is consistent with computeControlPoint', () => {
    const source = { x: 10, y: 20 }
    const target = { x: 30, y: 40 }
    const { midX, controlY } = computeControlPoint(source, target)
    const path = curvePath(source, target)
    expect(path).toBe(`M 10,20 Q ${midX},${controlY} 30,40`)
  })
})
