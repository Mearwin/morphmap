import { memo } from 'react'
import type { GameNode as GameNodeType } from '../types'
import { NODE } from '../constants'
import styles from './GameNode.module.css'

interface Props {
  node: GameNodeType
  color: string
  isSelected: boolean
  isHighlighted: boolean
  onSelect: (id: string | null) => void
  onHover?: (node: GameNodeType | null, pos: { clientX: number; clientY: number }) => void
}

export const GameNode = memo(function GameNode({ node, color, isSelected, isHighlighted, onSelect, onHover }: Props) {
  const opacity = isHighlighted ? 1 : 0.1
  const gradId = `ng-${node.id}`
  const glowGradId = `glow-${node.id}`
  const radius = isSelected ? node.radius * NODE.SELECTED_SCALE : node.radius
  const glowRadius = node.radius * NODE.SELECTED_SCALE * 3

  return (
    <g
      className={styles.node}
      transform={`translate(${node.x},${node.y})`}
      role="button"
      tabIndex={0}
      aria-label={`${node.title} (${node.date.slice(0, 4)})${isSelected ? ', selected' : ''}`}
      aria-pressed={isSelected}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(isSelected ? null : node.id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(isSelected ? null : node.id)
        }
      }}
      onPointerEnter={(e) => onHover?.(node, { clientX: e.clientX, clientY: e.clientY })}
      onPointerLeave={(e) => onHover?.(null, { clientX: e.clientX, clientY: e.clientY })}
      style={{ opacity }}
    >
      {isSelected && (
        <circle
          r={node.radius * NODE.SELECTED_SCALE}
          fill="none"
          stroke={color}
          strokeWidth={2}
          className={styles.ripple}
        />
      )}
      {isSelected && (
        <circle
          r={glowRadius}
          fill={`url(#${glowGradId})`}
          opacity={0.25}
        />
      )}
      <defs>
        <radialGradient id={glowGradId}>
          <stop offset="0%" stopColor={color} stopOpacity={1} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={gradId} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle
        r={radius + 4}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        className={styles.focusRing}
      />
      <circle
        r={radius}
        fill={color}
        stroke={isSelected ? '#fff' : color}
        strokeWidth={isSelected ? NODE.STROKE_SELECTED : NODE.STROKE_DEFAULT}
        className={styles.circle}
      />
      <circle
        r={radius}
        fill={`url(#${gradId})`}
        pointerEvents="none"
      />
      <text
        y={-node.radius * 2 + NODE.LABEL_OFFSET}
        textAnchor="middle"
        fill={isSelected ? 'var(--text)' : 'var(--text-muted)'}
        fontSize={isSelected ? NODE.FONT_SIZE_SELECTED : NODE.FONT_SIZE_DEFAULT}
        fontWeight={isSelected ? NODE.FONT_WEIGHT_SELECTED : NODE.FONT_WEIGHT_DEFAULT}
        className={styles.label}
      >
        {node.title}
      </text>
    </g>
  )
})
