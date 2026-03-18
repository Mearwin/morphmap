import { MINIMAP } from '../constants'

interface Point {
  x: number
  y: number
}

interface MinimapBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface MinimapLayout {
  bounds: MinimapBounds
  scaleX: number
  scaleY: number
  offsetX: number
  offsetY: number
  viewportRect: { x: number; y: number; w: number; h: number }
}

export function computeMinimapBounds(nodes: Point[]): MinimapBounds {
  if (nodes.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const n of nodes) {
    if (n.x < minX) minX = n.x
    if (n.x > maxX) maxX = n.x
    if (n.y < minY) minY = n.y
    if (n.y > maxY) maxY = n.y
  }
  const padX = (maxX - minX) * 0.05 || 50
  const padY = (maxY - minY) * 0.05 || 50
  return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY }
}

export function computeMinimapLayout(
  bounds: MinimapBounds,
  transform: { x: number; y: number; k: number },
  viewWidth: number,
  viewHeight: number,
  bottomOffset = 12,
): MinimapLayout {
  const worldW = bounds.maxX - bounds.minX
  const worldH = bounds.maxY - bounds.minY
  const scaleX = MINIMAP.WIDTH / worldW
  const scaleY = MINIMAP.HEIGHT / worldH

  const offsetX = viewWidth - MINIMAP.WIDTH - MINIMAP.PAD - 12
  const offsetY = viewHeight - MINIMAP.HEIGHT - MINIMAP.PAD - bottomOffset

  const vpLeft = -transform.x / transform.k
  const vpTop = -transform.y / transform.k
  const vpW = viewWidth / transform.k
  const vpH = viewHeight / transform.k

  return {
    bounds,
    scaleX,
    scaleY,
    offsetX,
    offsetY,
    viewportRect: {
      x: (vpLeft - bounds.minX) * scaleX,
      y: (vpTop - bounds.minY) * scaleY,
      w: Math.max(vpW * scaleX, 4),
      h: Math.max(vpH * scaleY, 4),
    },
  }
}

/** Map a world coordinate to minimap-local coordinate */
export function toMinimapX(worldX: number, bounds: MinimapBounds, scaleX: number): number {
  return (worldX - bounds.minX) * scaleX
}

export function toMinimapY(worldY: number, bounds: MinimapBounds, scaleY: number): number {
  return (worldY - bounds.minY) * scaleY
}
