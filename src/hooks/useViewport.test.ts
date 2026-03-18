import { describe, it, expect } from 'vitest'
import { isInViewport, type ViewportBounds } from './useViewport'

const bounds: ViewportBounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 }

describe('isInViewport', () => {
  it('returns true for point inside bounds', () => {
    expect(isInViewport(50, 50, bounds)).toBe(true)
  })

  it('returns true for point on boundary', () => {
    expect(isInViewport(0, 0, bounds)).toBe(true)
    expect(isInViewport(100, 100, bounds)).toBe(true)
  })

  it('returns false for point outside left', () => {
    expect(isInViewport(-1, 50, bounds)).toBe(false)
  })

  it('returns false for point outside right', () => {
    expect(isInViewport(101, 50, bounds)).toBe(false)
  })

  it('returns false for point outside top', () => {
    expect(isInViewport(50, -1, bounds)).toBe(false)
  })

  it('returns false for point outside bottom', () => {
    expect(isInViewport(50, 101, bounds)).toBe(false)
  })
})
