import { memo } from 'react'
import { TAG_CATEGORIES } from '../types'
import styles from './Legend.module.css'

export const Legend = memo(function Legend() {
  return (
    <div className={styles.legend} role="list" aria-label="Category legend">
      {TAG_CATEGORIES.map(cat => (
        <div key={cat.id} className={styles.item} role="listitem">
          <span className={styles.dot} style={{ background: `var(--cat-${cat.id})` }} aria-hidden="true" />
          <span className={styles.label}>{cat.label}</span>
        </div>
      ))}
    </div>
  )
})
