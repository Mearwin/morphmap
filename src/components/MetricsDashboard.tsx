import { useState, useEffect } from 'react'
import metrics from '../data/metrics.json'
import styles from './MetricsDashboard.module.css'

type AnimState = 'hidden' | 'entering' | 'visible' | 'exiting'

export function MetricsDashboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [anim, setAnim] = useState<AnimState>('hidden')

  useEffect(() => {
    if (open && (anim === 'hidden' || anim === 'exiting')) {
      setAnim('entering')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnim('visible'))
      })
    } else if (!open && (anim === 'visible' || anim === 'entering')) {
      setAnim('exiting')
      const timer = setTimeout(() => setAnim('hidden'), 250)
      return () => clearTimeout(timer)
    }
  }, [open, anim])

  if (anim === 'hidden') return null

  const animClass =
    anim === 'entering' ? styles.panelEntering :
    anim === 'exiting' ? styles.panelExiting :
    styles.panelVisible

  const decades = Object.entries(metrics.perDecade).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className={`${styles.panel} ${animClass}`}>
      <div className={styles.header}>
        <span className={styles.title}>Metrics</span>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close metrics">×</button>
      </div>

      {/* Most Influential per Decade */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Most Influential per Decade</div>
        {decades.map(([decade, data]) => (
          <div key={`inf-${decade}`} className={styles.decadeRow}>
            <span className={styles.decadeLabel}>{decade}s</span>
            <span className={styles.decadeValue}>
              {data.mostInfluential.title}
              <span className={styles.decadeCount}>{data.mostInfluential.descendants}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Most Derivative per Decade */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Most Derivative per Decade</div>
        {decades.map(([decade, data]) => (
          <div key={`der-${decade}`} className={styles.decadeRow}>
            <span className={styles.decadeLabel}>{decade}s</span>
            <span className={styles.decadeValue}>
              {data.mostDerivative.title}
              <span className={styles.decadeCount}>{data.mostDerivative.ancestors}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Cross-Genre */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Most Cross-Genre</div>
        {metrics.crossGenre.map((entry, i) => (
          <div key={entry.id} className={styles.rankRow}>
            <span className={styles.rankIndex}>{i + 1}</span>
            <span className={styles.rankName}>{entry.title}</span>
            <span className={styles.rankValue}>{entry.uniqueTagsSpanned} tags</span>
          </div>
        ))}
      </div>

      {/* Densest Hubs */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Densest Hubs</div>
        {metrics.densestHubs.map((entry, i) => (
          <div key={entry.id} className={styles.rankRow}>
            <span className={styles.rankIndex}>{i + 1}</span>
            <span className={styles.rankName}>{entry.title}</span>
            <span className={styles.rankValue}>{entry.connections}/{entry.contemporaries} ({entry.decade}s)</span>
          </div>
        ))}
      </div>

      {/* Clusters */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Clusters</div>
        {metrics.clusters.map((cluster, i) => (
          <div key={i} className={styles.clusterCard}>
            <div className={styles.clusterStats}>
              {cluster.games.length} games · {cluster.internalLinks} internal · {cluster.externalLinks} external links
            </div>
            <div className={styles.clusterPills}>
              {cluster.games.map(g => (
                <span key={g.id} className={styles.clusterPill}>{g.title}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Unexpected Connections */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Unexpected Connections</div>
        {metrics.unexpectedConnections.map((pair, i) => (
          <div key={i} className={styles.pairRow}>
            <span>{pair.source.title}</span>
            <span className={styles.pairArrow}>→</span>
            <span>{pair.target.title}</span>
            <span className={styles.pairDistance}>{pair.pathLength} hops</span>
          </div>
        ))}
      </div>
    </div>
  )
}
