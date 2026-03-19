import { memo, useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { hslFromPosition } from '../utils/tagColor'
import styles from './Legend.module.css'

export const Legend = memo(function Legend() {
  const { games } = useGameStore()

  const tagLabels = useMemo(() => {
    const allTags = new Set<string>()
    for (const g of games) for (const t of g.tags) allTags.add(t)
    const sortedTags = [...allTags].sort()
    const tagIndex = new Map(sortedTags.map((t, i) => [t, i]))
    const totalTags = sortedTags.length

    const counts: Record<string, number> = {}
    for (const g of games) for (const t of g.tags) counts[t] = (counts[t] || 0) + 1

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => ({
        tag,
        position: (tagIndex.get(tag)! / totalTags) * 100,
      }))
      .sort((a, b) => a.position - b.position)
  }, [games])

  const gradient = `linear-gradient(to right, ${
    Array.from({ length: 20 }, (_, i) => {
      const pos = i / 19
      return `${hslFromPosition(pos)} ${Math.round(pos * 100)}%`
    }).join(', ')
  })`

  return (
    <div className={styles.legend} role="img" aria-label="Tag color spectrum">
      <div className={styles.gradientBar} style={{ background: gradient }} />
      <div className={styles.labels}>
        {tagLabels.map(t => (
          <span key={t.tag} className={styles.label} style={{ left: `${t.position}%` }}>
            {t.tag}
          </span>
        ))}
      </div>
    </div>
  )
})
