import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import type { Game } from '../types'
import { useGameStore } from '../store/useGameStore'
import { exportSubgraphAsPng } from '../utils/exportSubgraph'
import styles from './GameDetail.module.css'

interface Props {
  game: Game | null
}

export function GameDetail({ game }: Props) {
  const { games, derived, dispatch } = useGameStore()
  const [displayedGame, setDisplayedGame] = useState<Game | null>(game)
  const [animState, setAnimState] = useState<'entering' | 'visible' | 'exiting' | 'hidden'>(
    game ? 'entering' : 'hidden'
  )
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [prevGame, setPrevGame] = useState<Game | null>(game)

  // Track the previous game id so imgFailed can be reset without an effect
  const [imgFailedForId, setImgFailedForId] = useState<string | null>(null)
  const imgFailed = imgFailedForId === displayedGame?.id

  // Detect prop changes and drive enter/exit animation state transitions
  if (game !== prevGame) {
    setPrevGame(game)

    if (game) {
      setDisplayedGame(game)
      setAnimState('entering')
    } else if (displayedGame) {
      setAnimState('exiting')
    }
  }

  // Handle deferred animation transitions that require timers/rAF
  useEffect(() => {
    if (animState === 'entering') {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimState('visible'))
      })
      return () => cancelAnimationFrame(id)
    }
    if (animState === 'exiting') {
      timerRef.current = setTimeout(() => {
        setAnimState('hidden')
        setDisplayedGame(null)
      }, 250)
      return () => clearTimeout(timerRef.current)
    }
  }, [animState])

  const ancestors = useMemo(
    () => displayedGame
      ? displayedGame.influencedBy
          .map(inf => games.find(g => g.id === inf.id))
          .filter(Boolean) as Game[]
      : [],
    [displayedGame, games]
  )

  const gameMap = useMemo(() => new Map(games.map(g => [g.id, g])), [games])

  const descendants = useMemo(
    () => {
      if (!displayedGame) return []
      const childIds = derived.adjacency.forward.get(displayedGame.id)
      if (!childIds) return []
      return [...childIds].map(id => gameMap.get(id)).filter(Boolean) as Game[]
    },
    [displayedGame, derived.adjacency, gameMap]
  )

  const handleExport = useCallback(() => {
    if (!displayedGame) return
    exportSubgraphAsPng(displayedGame.id, games, derived.links)
  }, [displayedGame, games, derived.links])

  if (animState === 'hidden' || !displayedGame) return null

  const isVisible = animState === 'visible'

  return (
    <div
      className={styles.panel}
      role="region"
      aria-label={`Details for ${displayedGame.title}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(24px)',
      }}
    >
      <div className={styles.header}>
        <span
          className={styles.dot}
          style={{ background: `var(--cat-${displayedGame.primaryTag})` }}
        />
        <h3 className={styles.title}>{displayedGame.title}</h3>
        <span className={styles.year}>{displayedGame.date.slice(0, 4)}</span>
        <button
          className={styles.closeBtn}
          onClick={() => dispatch({ type: 'SELECT_GAME', id: null })}
          aria-label="Close detail panel"
        >
          &times;
        </button>
      </div>

      {displayedGame.imageUrl && !imgFailed && (
        <img
          src={displayedGame.imageUrl}
          alt={`${displayedGame.title} cover art`}
          className={styles.coverImage}
          loading="lazy"
          onError={() => setImgFailedForId(displayedGame.id)}
        />
      )}

      <div className={styles.tags}>
        {displayedGame.tags.map(tag => (
          <span key={tag} className={styles.tag}>{tag}</span>
        ))}
      </div>

      {ancestors.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Influenced by</div>
          {ancestors.map(a => (
            <button
              key={a.id}
              className={styles.ancestor}
              onClick={() => dispatch({ type: 'SELECT_GAME', id: a.id })}
            >
              {a.title} ({a.date.slice(0, 4)})
            </button>
          ))}
        </div>
      )}

      {descendants.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Influenced</div>
          {descendants.map(d => (
            <button
              key={d.id}
              className={styles.ancestor}
              onClick={() => dispatch({ type: 'SELECT_GAME', id: d.id })}
            >
              {d.title} ({d.date.slice(0, 4)})
            </button>
          ))}
        </div>
      )}

      {(ancestors.length > 0 || descendants.length > 0) && (
        <div className={styles.section}>
          <button
            className={styles.exportBtn}
            onClick={() => dispatch({ type: 'SET_VIEW_MODE', mode: 'lineage' })}
          >
            View lineage
          </button>
          <button className={styles.exportBtn} onClick={handleExport} style={{ marginTop: 6 }}>
            Export lineage as PNG
          </button>
        </div>
      )}
    </div>
  )
}
