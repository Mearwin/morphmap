import { describe, it, expect } from 'vitest'
import { resolveOverlaps, influenceStrokeWidth, type LabelInfo } from './labelPlacement'
import { LABEL, LINE } from '../constants'

function makeLabel(x: number, y: number, text = 'test'): LabelInfo {
  return { x, y, text, width: text.length * LABEL.CHAR_WIDTH + LABEL.PADDING }
}

function hasOverlap(a: LabelInfo, b: LabelInfo): boolean {
  const overlapX = (a.width / 2 + b.width / 2 + LABEL.GAP) - Math.abs(a.x - b.x)
  const overlapY = LABEL.HEIGHT - Math.abs(a.y - b.y)
  return overlapX > 0 && overlapY > 0
}

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

describe('resolveOverlaps', () => {
  it('returns empty array unchanged', () => {
    expect(resolveOverlaps([])).toEqual([])
  })

  it('returns single label unchanged', () => {
    const label = makeLabel(100, 200)
    const result = resolveOverlaps([label])
    expect(result).toHaveLength(1)
    expect(result[0].x).toBe(100)
    expect(result[0].y).toBe(200)
  })

  it('does not move non-overlapping labels', () => {
    const a = makeLabel(0, 0, 'hi')
    const b = makeLabel(500, 0, 'hi')
    const result = resolveOverlaps([a, b])
    expect(result[0].x).toBe(0)
    expect(result[1].x).toBe(500)
  })

  it('separates two overlapping labels vertically', () => {
    const a = makeLabel(100, 100)
    const b = makeLabel(100, 100)
    const result = resolveOverlaps([a, b])
    expect(hasOverlap(result[0], result[1])).toBe(false)
  })

  it('separates three stacked labels', () => {
    const labels = [
      makeLabel(100, 100),
      makeLabel(100, 102),
      makeLabel(100, 104),
    ]
    const result = resolveOverlaps(labels)
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        expect(hasOverlap(result[i], result[j])).toBe(false)
      }
    }
  })

  it('handles labels that overlap on x but not y', () => {
    const a = makeLabel(100, 0)
    const b = makeLabel(110, 100) // close in x but far in y
    const result = resolveOverlaps([a, b])
    // Should remain roughly in place since they don't overlap
    expect(Math.abs(result[0].y - 0)).toBeLessThan(1)
    expect(Math.abs(result[1].y - 100)).toBeLessThan(1)
  })

  it('preserves label count', () => {
    const labels = Array.from({ length: 20 }, (_, i) => makeLabel(i * 5, 100))
    const result = resolveOverlaps(labels)
    expect(result).toHaveLength(20)
  })

  it('does not mutate input', () => {
    const a = makeLabel(100, 100)
    const b = makeLabel(100, 100)
    const origAy = a.y
    const origBy = b.y
    resolveOverlaps([a, b])
    expect(a.y).toBe(origAy)
    expect(b.y).toBe(origBy)
  })
})
