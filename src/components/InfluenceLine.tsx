import { memo } from 'react'
import type { GameNode } from '../types'
import { LINE } from '../constants'
import { influenceStrokeWidth } from '../utils/labelPlacement'
import { curvePath } from '../utils/curve'

interface Props {
  source: GameNode
  target: GameNode
  through: string[]
  opacity: number
  isHighlighted: boolean
  isHovered?: boolean
  onHoverLink?: (source: string, target: string) => void
  onLeaveLink?: () => void
}

export const InfluenceLine = memo(function InfluenceLine({
  source, target, through, opacity, isHighlighted, isHovered,
  onHoverLink, onLeaveLink,
}: Props) {
  const d = curvePath(source, target)
  const baseWidth = influenceStrokeWidth(through.length)
  const strokeWidth = isHighlighted ? baseWidth * (LINE.STROKE_HIGHLIGHTED / LINE.STROKE_DEFAULT) : baseWidth

  return (
    <g aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={isHovered ? Math.max(strokeWidth, 3) : strokeWidth}
        opacity={isHovered ? 0.9 : opacity}
        style={{ transition: 'opacity 0.3s ease, stroke-width 0.2s ease' }}
        pointerEvents="none"
      />
      {/* Invisible fat hit area for hover detection */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        pointerEvents="stroke"
        onMouseEnter={() => onHoverLink?.(source.id, target.id)}
        onMouseLeave={() => onLeaveLink?.()}
        style={{ cursor: 'pointer' }}
      />
    </g>
  )
})
