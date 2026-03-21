import { useEffect } from 'react'
import { useDataset } from '../dataset/DatasetContext'
import styles from './ShortcutOverlay.module.css'

type Props = { onClose: () => void }

export function ShortcutOverlay({ onClose }: Props) {
  const { entityLabel, entityLabelPlural } = useDataset()

  const shortcuts = [
    { keys: ['/'], action: 'Focus search' },
    { keys: ['Esc'], action: `Deselect ${entityLabel} / close panel` },
    { keys: ['\u2190'], action: 'Navigate to ancestor' },
    { keys: ['\u2192'], action: 'Navigate to descendant' },
    { keys: ['\u2191', '\u2193'], action: `Cycle connected ${entityLabelPlural}` },
    { keys: ['?'], action: 'Toggle this overlay' },
  ]
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.title}>Keyboard shortcuts</div>
        {shortcuts.map(s => (
          <div key={s.action} className={styles.row}>
            <span className={styles.action}>{s.action}</span>
            <span className={styles.keys}>
              {s.keys.map(k => (
                <kbd key={k} className={styles.kbd}>{k}</kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
