import { useMemo, useState, useEffect, useRef, useCallback, type SyntheticEvent } from 'react'
import type { Entity } from '../types'
import { useGameStore } from '../store/useGameStore'
import { useDataset } from '../dataset/DatasetContext'
import { exportSubgraphAsPng } from '../utils/exportSubgraph'
import { ColorExplainer } from './ColorExplainer'
import styles from './GameDetail.module.css'

interface Props {
  game: Entity | null
}

export function GameDetail({ game }: Props) {
  const { games, derived, dispatch } = useGameStore()
  const { influenceLabel, influencedLabel, gameColors } = useDataset()
  const [displayedGame, setDisplayedGame] = useState<Entity | null>(game)
  const [animState, setAnimState] = useState<'entering' | 'visible' | 'exiting' | 'hidden'>(
    game ? 'entering' : 'hidden'
  )
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [prevGame, setPrevGame] = useState<Entity | null>(game)

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

  const gameMap = useMemo(() => new Map(games.map(g => [g.id, g])), [games])

  const ancestors = useMemo(
    () => displayedGame
      ? displayedGame.influencedBy
          .map(inf => gameMap.get(inf.id))
          .filter(Boolean) as Entity[]
      : [],
    [displayedGame, gameMap]
  )

  const descendants = useMemo(
    () => {
      if (!displayedGame) return []
      const childIds = derived.adjacency.forward.get(displayedGame.id)
      if (!childIds) return []
      return [...childIds].map(id => gameMap.get(id)).filter(Boolean) as Entity[]
    },
    [displayedGame, derived.adjacency, gameMap]
  )

  const similarGames = useMemo(() => {
    if (!displayedGame) return []
    const selectedTags = new Set(displayedGame.tags)
    const selectedTagCount = displayedGame.tags.length
    const excludeIds = new Set([displayedGame.id, ...ancestors.map(a => a.id), ...descendants.map(d => d.id)])
    const scored: { game: Entity; score: number; shared: string[] }[] = []
    for (const g of games) {
      if (excludeIds.has(g.id)) continue
      const shared = g.tags.filter(t => selectedTags.has(t))
      if (shared.length === 0) continue
      // Jaccard = intersection / union, union = |A| + |B| - |intersection|
      const score = shared.length / (selectedTagCount + g.tags.length - shared.length)
      if (score < 1 / 3) continue
      scored.push({ game: g, score, shared })
    }
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 5)
  }, [displayedGame, games, ancestors, descendants])

  const handleExport = useCallback(() => {
    if (!displayedGame) return
    exportSubgraphAsPng(displayedGame.id, games, derived.links, gameColors)
  }, [displayedGame, games, derived.links, gameColors])

  const [copied, setCopied] = useState(false)

  const handleCopyEmbed = useCallback(() => {
    if (!displayedGame) return
    const origin = window.location.origin
    const src = `${origin}/#game=${displayedGame.id}&embed=true`
    const iframe = `<iframe src="${src}" width="800" height="500" style="border:1px solid #1e1e2e;border-radius:8px" loading="lazy"></iframe>`
    navigator.clipboard.writeText(iframe).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [displayedGame])

  if (animState === 'hidden' || !displayedGame) return null

  const isVisible = animState === 'visible'

  return (
    <div
      className={`${styles.panel}${isVisible ? ` ${styles.panelVisible}` : ''}`}
      role="region"
      aria-label={`Details for ${displayedGame.title}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(24px)',
      }}
    >
      <div className={styles.card}>
        <div className={styles.header}>
          <span
            className={styles.dot}
            style={{ background: gameColors.get(displayedGame.id) ?? '#6b6b80' }}
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

        {typeof displayedGame.imageUrl === 'string' && displayedGame.imageUrl && !imgFailed && (
          <CoverImage
            key={displayedGame.id}
            src={displayedGame.imageUrl}
            alt={`${displayedGame.title} cover art`}
            onError={() => setImgFailedForId(displayedGame.id)}
          />
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.tags}>
          {displayedGame.tags.map(tag => (
            <button
              key={tag}
              className={styles.tag}
              onClick={() => dispatch({ type: 'SELECT_TAG', tag })}
            >
              {tag}
            </button>
          ))}
        </div>

        <ColorExplainer game={displayedGame} />
      </div>

      {ancestors.length > 0 && (
        <div className={styles.card}>
          <div className={styles.sectionLabel}>{influenceLabel}</div>
          {ancestors.map(a => (
            <button
              key={a.id}
              className={styles.ancestor}
              onClick={() => dispatch({ type: 'SELECT_GAME', id: a.id })}
              style={{ ['--game-color' as string]: gameColors.get(a.id) ?? 'var(--accent-secondary)' }}
            >
              {a.title} ({a.date.slice(0, 4)})
            </button>
          ))}
        </div>
      )}

      {descendants.length > 0 && (
        <div className={styles.card}>
          <div className={styles.sectionLabel}>{influencedLabel}</div>
          {descendants.map(d => (
            <button
              key={d.id}
              className={styles.ancestor}
              onClick={() => dispatch({ type: 'SELECT_GAME', id: d.id })}
              style={{ ['--game-color' as string]: gameColors.get(d.id) ?? 'var(--accent-secondary)' }}
            >
              {d.title} ({d.date.slice(0, 4)})
            </button>
          ))}
        </div>
      )}

      {similarGames.length > 0 && (
        <div className={styles.card}>
          <div className={styles.sectionLabel}>Similar</div>
          {similarGames.map(({ game: g, score, shared }) => (
            <button
              key={g.id}
              className={styles.ancestor}
              onClick={() => dispatch({ type: 'SELECT_GAME', id: g.id })}
              title={shared.join(', ')}
              style={{ ['--game-color' as string]: gameColors.get(g.id) ?? 'var(--accent-secondary)' }}
            >
              {g.title} ({g.date.slice(0, 4)})
              <span className={styles.similarScore}>{Math.round(score * 100)}%</span>
            </button>
          ))}
        </div>
      )}

      {(ancestors.length > 0 || descendants.length > 0) && (
        <div className={styles.card}>
          <button
            className={styles.exportBtn}
            onClick={() => dispatch({ type: 'SET_VIEW_MODE', mode: 'lineage' })}
          >
            View lineage
          </button>
          <button className={styles.exportBtn} onClick={handleExport} style={{ marginTop: 6 }}>
            Export lineage as PNG
          </button>
          <button className={styles.exportBtn} onClick={handleCopyEmbed} style={{ marginTop: 6 }}>
            {copied ? 'Copied!' : 'Copy embed code'}
          </button>
        </div>
      )}
    </div>
  )
}

function CoverImage({ src, alt, onError }: { src: string; alt: string; onError: () => void }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <img
      src={src}
      alt={alt}
      className={styles.coverImage}
      // decode async so the browser doesn't block paint on decode
      decoding="async"
      // fetchpriority low so it doesn't compete with more important requests
      fetchPriority="low"
      onLoad={(e: SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.style.opacity = '1'
        setLoaded(true)
      }}
      onError={onError}
      style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s ease' }}
    />
  )
}
