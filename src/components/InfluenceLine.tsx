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
}

export const InfluenceLine = memo(function InfluenceLine({ source, target, through, opacity, isHighlighted }: Props) {
  const d = curvePath(source, target)
  const baseWidth = influenceStrokeWidth(through.length)
  const strokeWidth = isHighlighted ? baseWidth * (LINE.STROKE_HIGHLIGHTED / LINE.STROKE_DEFAULT) : baseWidth

  return (
    <g aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={strokeWidth}
        opacity={opacity}
        style={{ transition: 'opacity 0.3s ease, stroke-width 0.2s ease' }}
        pointerEvents="none"
      />
    </g>
  )
})
