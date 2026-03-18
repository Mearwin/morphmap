import { memo } from 'react'
import type { GameNode as GameNodeType } from '../types'
import { NODE } from '../constants'
import styles from './GameNode.module.css'

interface Props {
  node: GameNodeType
  isSelected: boolean
  isHighlighted: boolean
  onSelect: (id: string | null) => void
  onHover?: (node: GameNodeType | null, pos: { clientX: number; clientY: number }) => void
}

export const GameNode = memo(function GameNode({ node, isSelected, isHighlighted, onSelect, onHover }: Props) {
  const color = `var(--cat-${node.primaryTag})`
  const opacity = isHighlighted ? 1 : 0.1

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
      <circle
        r={(isSelected ? node.radius * NODE.SELECTED_SCALE : node.radius) + 4}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        className={styles.focusRing}
      />
      <circle
        r={isSelected ? node.radius * NODE.SELECTED_SCALE : node.radius}
        fill={color}
        stroke={isSelected ? '#fff' : color}
        strokeWidth={isSelected ? NODE.STROKE_SELECTED : NODE.STROKE_DEFAULT}
        className={styles.circle}
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
