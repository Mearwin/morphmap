import { memo, useId, useMemo } from 'react'
import type { ZoomTransform } from 'd3-zoom'
import type { GameNode } from '../types'
import { MINIMAP } from '../constants'
import { computeMinimapBounds, computeMinimapLayout, toMinimapX, toMinimapY } from '../utils/minimapLayout'

interface Props {
  nodes: GameNode[]
  gameColors: Map<string, string>
  transform: ZoomTransform
  viewWidth: number
  viewHeight: number
}

export const Minimap = memo(function Minimap({ nodes, gameColors, transform, viewWidth, viewHeight }: Props) {
  const clipId = useId()
  const bounds = useMemo(() => computeMinimapBounds(nodes), [nodes])
  const layout = computeMinimapLayout(bounds, transform, viewWidth, viewHeight)
  const { offsetX, offsetY, scaleX, scaleY, viewportRect } = layout

  return (
    <g transform={`translate(${offsetX},${offsetY})`}>
      <rect
        x={0}
        y={0}
        width={MINIMAP.WIDTH}
        height={MINIMAP.HEIGHT}
        rx={MINIMAP.BORDER_RADIUS}
        fill="var(--surface)"
        stroke="var(--border)"
        strokeWidth={1}
        opacity={0.92}
      />
      <clipPath id={clipId}>
        <rect x={0} y={0} width={MINIMAP.WIDTH} height={MINIMAP.HEIGHT} rx={MINIMAP.BORDER_RADIUS} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {nodes.map(n => (
          <circle
            key={n.id}
            cx={toMinimapX(n.x, bounds, scaleX)}
            cy={toMinimapY(n.y, bounds, scaleY)}
            r={1.2}
            fill={gameColors.get(n.id) ?? '#6b6b80'}
            opacity={0.7}
          />
        ))}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={viewportRect.w}
          height={viewportRect.h}
          fill="var(--accent-dim)"
          stroke="var(--accent)"
          strokeWidth={1}
          rx={1}
        />
      </g>
    </g>
  )
})
