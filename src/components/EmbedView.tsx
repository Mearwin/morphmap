import { useGameStore } from '../store/useGameStore'
import { useDataset } from '../dataset/DatasetContext'
import { LineageView } from './LineageView'
import styles from './EmbedView.module.css'

export function EmbedView() {
  const { state, games } = useGameStore()
  const { gameColors } = useDataset()
  const game = state.selectedGameId
    ? games.find(g => g.id === state.selectedGameId) ?? null
    : null

  if (!game) {
    return (
      <div className={styles.container}>
        <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: 14 }}>
          No game specified. Use <code>#game=game-id&amp;embed=true</code>
        </div>
      </div>
    )
  }

  const fullUrl = window.location.href.replace(/[&?]embed=true/, '').replace(/[&?]depth=\d+/, '')

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span
          style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: gameColors.get(game.id) ?? '#6b6b80',
          }}
        />
        <span className={styles.title}>{game.title}</span>
        <span className={styles.year}>{game.date.slice(0, 4)}</span>
        <a className={styles.badge} href={fullUrl} target="_blank" rel="noopener noreferrer">
          Morphmap
        </a>
      </div>
      <div className={styles.body}>
        <LineageView maxDepth={state.depth ?? undefined} />
      </div>
    </div>
  )
}
