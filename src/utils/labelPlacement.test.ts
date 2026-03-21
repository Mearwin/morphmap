import { describe, it, expect } from 'vitest'
import { influenceStrokeWidth } from './labelPlacement'
import { LINE } from '../constants'

describe('influenceStrokeWidth', () => {
  it('returns min width for 0 tags', () => {
    expect(influenceStrokeWidth(0)).toBe(LINE.STROKE_STRENGTH_MIN)
  })

  it('returns max width at max tags', () => {
    expect(influenceStrokeWidth(LINE.STROKE_STRENGTH_TAGS_MAX)).toBe(LINE.STROKE_STRENGTH_MAX)
  })

  it('returns max width when exceeding max tags', () => {
    expect(influenceStrokeWidth(100)).toBe(LINE.STROKE_STRENGTH_MAX)
  })

  it('returns value between min and max for 1 tag', () => {
    const w = influenceStrokeWidth(1)
    expect(w).toBeGreaterThan(LINE.STROKE_STRENGTH_MIN)
    expect(w).toBeLessThan(LINE.STROKE_STRENGTH_MAX)
  })

  it('increases monotonically with tag count', () => {
    const w1 = influenceStrokeWidth(1)
    const w2 = influenceStrokeWidth(2)
    const w3 = influenceStrokeWidth(3)
    expect(w2).toBeGreaterThan(w1)
    expect(w3).toBeGreaterThan(w2)
  })
})
