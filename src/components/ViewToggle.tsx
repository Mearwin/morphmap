import { useGameStore } from '../store/useGameStore'
import styles from './ViewToggle.module.css'

export function ViewToggle() {
  const { state, dispatch } = useGameStore()

  return (
    <div className={styles.toggle} role="radiogroup" aria-label="View mode">
      <button
        className={`${styles.pill} ${state.viewMode === 'timeline' ? styles.active : ''}`}
        role="radio"
        aria-checked={state.viewMode === 'timeline'}
        onClick={() => dispatch({ type: 'SET_VIEW_MODE', mode: 'timeline' })}
      >
        Graph
      </button>
      <button
        className={`${styles.pill} ${state.viewMode === 'river' ? styles.active : ''}`}
        role="radio"
        aria-checked={state.viewMode === 'river'}
        onClick={() => dispatch({ type: 'SET_VIEW_MODE', mode: 'river' })}
      >
        River
      </button>
      <button
        className={`${styles.pill} ${state.viewMode === 'lineage' ? styles.active : ''} ${!state.selectedGameId ? styles.disabled : ''}`}
        role="radio"
        aria-checked={state.viewMode === 'lineage'}
        onClick={() => state.selectedGameId && dispatch({ type: 'SET_VIEW_MODE', mode: 'lineage' })}
        disabled={!state.selectedGameId}
      >
        Lineage
      </button>
    </div>
  )
}
