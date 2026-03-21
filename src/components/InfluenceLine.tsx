import { memo, useMemo } from 'react'
import type { GameNode } from '../types'
import { LINE } from '../constants'
import { influenceStrokeWidth } from '../utils/labelPlacement'
import { curvePath } from '../utils/curve'
import styles from './InfluenceLine.module.css'

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

  // Estimate path length for draw-in animation (generous for curve overshoot)
  const pathLength = useMemo(() => {
    const dx = target.x - source.x
    const dy = target.y - source.y
    return Math.sqrt(dx * dx + dy * dy) * 1.3
  }, [source.x, source.y, target.x, target.y])

  return (
    <g aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={isHovered ? Math.max(strokeWidth, 3) : strokeWidth}
        opacity={isHovered ? 0.9 : opacity}
        strokeDasharray={isHighlighted ? pathLength : undefined}
        strokeDashoffset={0}
        className={isHighlighted ? styles.drawIn : undefined}
        style={{
          transition: 'opacity 0.3s ease, stroke-width 0.2s ease',
          ['--path-length' as string]: pathLength,
        }}
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
