import { useState } from 'react'
import type { Entity } from '../types'
import styles from './LineageCard.module.css'

interface Props {
  game: Entity
  color: string
  isSelected: boolean
  onClick: (id: string) => void
}

export function LineageCard({ game, color, isSelected, onClick }: Props) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <button
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={() => onClick(game.id)}
      aria-label={`${game.title} (${game.date.slice(0, 4)})${isSelected ? ', selected' : ''}`}
    >
      <div className={styles.tagBar} style={{ background: color }} />
      {typeof game.imageUrl === 'string' && game.imageUrl && !imgFailed ? (
        <img
          src={game.imageUrl as string}
          alt=""
          className={styles.cover}
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className={styles.placeholder}
          style={{ background: color, opacity: 0.15 }}
        >
          {game.title.charAt(0)}
        </div>
      )}
      <div className={styles.info}>
        <div className={styles.title}>{game.title}</div>
        <div className={styles.year}>{game.date.slice(0, 4)}</div>
      </div>
    </button>
  )
}
