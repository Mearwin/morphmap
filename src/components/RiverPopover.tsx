import { useEffect } from 'react'
import { TAG_CATEGORIES } from '../types'
import type { EraCategoryCell } from '../utils/riverData'
import styles from './RiverPopover.module.css'

interface Props {
  categoryId: string
  eraLabel: string
  cell: EraCategoryCell
  x: number
  y: number
  onClose: () => void
  onSelectGame: (id: string) => void
}

export function RiverPopover({ categoryId, eraLabel, cell, x, y, onClose, onSelectGame }: Props) {
  const category = TAG_CATEGORIES.find(c => c.id === categoryId)
  const label = category?.label ?? categoryId
  const color = category?.color ?? '#6b7280'

  // Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  // Position: keep popover on screen
  const popoverStyle: React.CSSProperties = {
    left: Math.min(x, window.innerWidth - 300),
    top: Math.min(y, window.innerHeight - 340),
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.popover} style={popoverStyle}>
        <div className={styles.header}>
          <span className={styles.dot} style={{ background: color }} />
          <span className={styles.categoryName}>{label}</span>
          <span className={styles.era}>{eraLabel}</span>
        </div>
        <div className={styles.count}>
          {cell.count} influence{cell.count !== 1 ? 's' : ''} received
        </div>
        <div className={styles.gameList}>
          {cell.games.length === 0 && (
            <span className={styles.empty}>No games in this era</span>
          )}
          {cell.games.map(g => (
            <button
              key={g.id}
              className={styles.gameRow}
              onClick={() => onSelectGame(g.id)}
            >
              <span className={styles.gameTitle}>{g.title}</span>
              <span className={styles.gameYear}>{g.year}</span>
              {g.incomingCount > 0 && (
                <span className={styles.gameInfluences}>
                  {g.incomingCount} in
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
