import { useMemo } from 'react'
import type { Entity } from '../types'
import { useDataset } from '../dataset/DatasetContext'
import { explainGameColor, hslFromPosition } from '../utils/tagColor'
import styles from './ColorExplainer.module.css'

interface Props {
  game: Entity
}

export function ColorExplainer({ game }: Props) {
  const { tagIndex, totalTags, normMin, normRange } = useDataset()

  const explanation = useMemo(() => {
    return explainGameColor(game.tags, tagIndex, totalTags, normMin, normRange)
  }, [game.tags, tagIndex, totalTags, normMin, normRange])

  // Build the same gradient as the legend
  const gradient = `linear-gradient(to right, ${
    Array.from({ length: 20 }, (_, i) => {
      const pos = i / 19
      return `${hslFromPosition(pos)} ${Math.round(pos * 100)}%`
    }).join(', ')
  })`

  const avgColor = hslFromPosition(explanation.average)

  return (
    <div className={styles.container}>
      <div className={styles.label}>Color from tags</div>

      {/* Gradient bar with tag markers and average */}
      <div className={styles.barArea}>
        <div className={styles.bar} style={{ background: gradient }}>
          {/* Individual tag markers */}
          {explanation.tagPositions.map(t => (
            <span
              key={t.tag}
              className={styles.tagTick}
              style={{ left: `${t.position * 100}%` }}
              title={t.tag}
            />
          ))}
          {/* Average marker */}
          <span
            className={styles.avgMarker}
            style={{ left: `${explanation.average * 100}%`, background: avgColor }}
          />
        </div>

        {/* Tag labels below the bar */}
        <div className={styles.tagLabels}>
          {explanation.tagPositions.map(t => (
            <span
              key={t.tag}
              className={styles.tagLabel}
              style={{ left: `${t.position * 100}%`, color: hslFromPosition(t.position) }}
            >
              {t.tag}
            </span>
          ))}
        </div>
      </div>

      {/* Result line */}
      <div className={styles.result}>
        <span className={styles.resultDot} style={{ background: avgColor }} />
        <span className={styles.resultText}>
          average of {explanation.tagPositions.length} tags
        </span>
      </div>
    </div>
  )
}
