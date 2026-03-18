import { useRef, useCallback } from 'react'
import type { GameNode } from '../types'
import { TAG_CATEGORIES } from '../types'
import styles from './Tooltip.module.css'

interface Props {
  node: GameNode
  x: number
  y: number
}

const OFFSET = 12
const MARGIN = 8

export function Tooltip({ node, x, y }: Props) {
  const categoryLabel = TAG_CATEGORIES.find(c => c.id === node.primaryTag)?.label ?? node.primaryTag
  const ref = useRef<HTMLDivElement>(null)

  // Position with boundary detection via callback ref + inline style
  const positionRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    ref.current = el

    let left = x + OFFSET
    let top = y - OFFSET
    const rect = el.getBoundingClientRect()

    if (left + rect.width > window.innerWidth - MARGIN) {
      left = x - rect.width - OFFSET
    }
    if (left < MARGIN) left = MARGIN
    if (top + rect.height > window.innerHeight - MARGIN) {
      top = window.innerHeight - MARGIN - rect.height
    }
    if (top < MARGIN) top = MARGIN

    el.style.left = `${left}px`
    el.style.top = `${top}px`
  }, [x, y])

  return (
    <div
      ref={positionRef}
      className={styles.tooltip}
      style={{ left: x + OFFSET, top: y - OFFSET }}
    >
      <div className={styles.header}>
        <span className={styles.dot} style={{ background: `var(--cat-${node.primaryTag})` }} />
        <span className={styles.title}>{node.title}</span>
        <span className={styles.year}>{node.date.slice(0, 4)}</span>
      </div>
      <div className={styles.category}>{categoryLabel}</div>
      {node.tags.length > 0 && (
        <div className={styles.tags}>
          {node.tags.map(tag => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      )}
      {node.influencedBy.length > 0 && (
        <div className={styles.influences}>
          {node.influencedBy.length} influence{node.influencedBy.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
