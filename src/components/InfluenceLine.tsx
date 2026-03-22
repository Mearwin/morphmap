import { memo, useMemo } from 'react'
import type { GameNode } from '../types'
import { influenceStrokeWidth } from '../utils/labelPlacement'
import { curvePath } from '../utils/curve'

interface Props {
  source: GameNode
  target: GameNode
  through: string[]
  isHovered?: boolean
  onHoverLink?: (source: string, target: string) => void
  onLeaveLink?: () => void
}

export const InfluenceLine = memo(function InfluenceLine({
  source, target, through, isHovered,
  onHoverLink, onLeaveLink,
}: Props) {
  const d = curvePath(source, target)
  const baseWidth = influenceStrokeWidth(through.length)

  // Estimate path length for draw-in animation (generous for curve overshoot)
  const pathLength = useMemo(() => {
    const dx = target.x - source.x
    const dy = target.y - source.y
    return Math.sqrt(dx * dx + dy * dy) * 1.3
  }, [source.x, source.y, target.x, target.y])

  return (
    <g aria-hidden="true" data-link-id={`${source.id}--${target.id}`}>
      <path
        d={d}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={isHovered ? Math.max(baseWidth, 3) : baseWidth}
        opacity={isHovered ? 0.9 : undefined}
        style={{
          transition: 'stroke-width 0.2s ease',
          ['--path-length' as string]: pathLength,
        }}
        pointerEvents="none"
      />
      {/* Invisible fat hit area for hover detection — pointer-events controlled via CSS */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        onMouseEnter={() => onHoverLink?.(source.id, target.id)}
        onMouseLeave={() => onLeaveLink?.()}
        style={{ cursor: 'pointer' }}
      />
    </g>
  )
})
