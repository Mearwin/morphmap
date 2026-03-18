import { useMemo } from 'react'
import type { ZoomTransform } from 'd3-zoom'

export interface ViewportBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/**
 * Compute the visible world-space bounds from the current zoom transform.
 * Adds a margin (in world-space pixels) so elements don't pop in at the edge.
 */
export function useViewport(
  transform: ZoomTransform,
  viewWidth: number,
  viewHeight: number,
  margin: number = 100,
): ViewportBounds {
  return useMemo(() => {
    // Invert screen corners to world coordinates
    const [x0, y0] = transform.invert([0, 0])
    const [x1, y1] = transform.invert([viewWidth, viewHeight])

    return {
      minX: x0 - margin,
      maxX: x1 + margin,
      minY: y0 - margin,
      maxY: y1 + margin,
    }
  }, [transform, viewWidth, viewHeight, margin])
}

export function isInViewport(x: number, y: number, bounds: ViewportBounds): boolean {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY
}
