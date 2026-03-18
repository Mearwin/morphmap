import { describe, it, expect } from 'vitest'
import { computeMinimapBounds, computeMinimapLayout, toMinimapX, toMinimapY } from './minimapLayout'
import { MINIMAP } from '../constants'

describe('computeMinimapBounds', () => {
  it('returns default bounds for empty nodes', () => {
    expect(computeMinimapBounds([])).toEqual({ minX: 0, maxX: 1, minY: 0, maxY: 1 })
  })

  it('computes bounds with padding for multiple nodes', () => {
    const nodes = [{ x: 0, y: 0 }, { x: 100, y: 200 }]
    const bounds = computeMinimapBounds(nodes)
    // 5% padding on each side
    expect(bounds.minX).toBe(-5)
    expect(bounds.maxX).toBe(105)
    expect(bounds.minY).toBe(-10)
    expect(bounds.maxY).toBe(210)
  })

  it('uses fallback padding of 50 when range is 0', () => {
    const nodes = [{ x: 50, y: 50 }]
    const bounds = computeMinimapBounds(nodes)
    expect(bounds.minX).toBe(0)
    expect(bounds.maxX).toBe(100)
    expect(bounds.minY).toBe(0)
    expect(bounds.maxY).toBe(100)
  })
})

describe('computeMinimapLayout', () => {
  const bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 500 }
  const identity = { x: 0, y: 0, k: 1 }

  it('computes scale based on MINIMAP dimensions', () => {
    const layout = computeMinimapLayout(bounds, identity, 800, 600)
    expect(layout.scaleX).toBe(MINIMAP.WIDTH / 1000)
    expect(layout.scaleY).toBe(MINIMAP.HEIGHT / 500)
  })

  it('positions minimap in bottom-right corner', () => {
    const layout = computeMinimapLayout(bounds, identity, 800, 600)
    expect(layout.offsetX).toBe(800 - MINIMAP.WIDTH - MINIMAP.PAD - 12)
    expect(layout.offsetY).toBe(600 - MINIMAP.HEIGHT - MINIMAP.PAD - 12)
  })

  it('applies custom bottomOffset', () => {
    const layout = computeMinimapLayout(bounds, identity, 800, 600, 280)
    expect(layout.offsetY).toBe(600 - MINIMAP.HEIGHT - MINIMAP.PAD - 280)
  })

  it('computes viewport rect for identity transform', () => {
    const layout = computeMinimapLayout(bounds, identity, 800, 600)
    expect(layout.viewportRect.x).toBeCloseTo(0 * layout.scaleX)
    expect(layout.viewportRect.y).toBeCloseTo(0 * layout.scaleY)
    expect(layout.viewportRect.w).toBeCloseTo(800 * layout.scaleX)
    expect(layout.viewportRect.h).toBeCloseTo(600 * layout.scaleY)
  })

  it('adjusts viewport rect for zoomed-in transform', () => {
    const zoomed = { x: -100, y: -50, k: 2 }
    const layout = computeMinimapLayout(bounds, zoomed, 800, 600)
    // vpLeft = 100/2 = 50, vpW = 800/2 = 400
    expect(layout.viewportRect.x).toBeCloseTo((50 - bounds.minX) * layout.scaleX)
    expect(layout.viewportRect.w).toBeCloseTo(400 * layout.scaleX)
  })

  it('enforces minimum viewport rect size of 4', () => {
    const veryZoomed = { x: 0, y: 0, k: 10000 }
    const layout = computeMinimapLayout(bounds, veryZoomed, 800, 600)
    expect(layout.viewportRect.w).toBeGreaterThanOrEqual(4)
    expect(layout.viewportRect.h).toBeGreaterThanOrEqual(4)
  })
})

describe('toMinimapX / toMinimapY', () => {
  const bounds = { minX: 100, maxX: 300, minY: 50, maxY: 250 }

  it('maps minX to 0', () => {
    expect(toMinimapX(100, bounds, 0.5)).toBe(0)
  })

  it('maps world coordinate with scale', () => {
    expect(toMinimapX(200, bounds, 0.5)).toBe(50)
  })

  it('maps minY to 0', () => {
    expect(toMinimapY(50, bounds, 2)).toBe(0)
  })

  it('maps world Y coordinate with scale', () => {
    expect(toMinimapY(150, bounds, 2)).toBe(200)
  })
})
