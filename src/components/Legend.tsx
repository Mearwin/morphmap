import { memo, useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { useDataset } from '../dataset/DatasetContext'
import { hslFromPosition } from '../utils/tagColor'
import styles from './Legend.module.css'

export const Legend = memo(function Legend() {
  const { games } = useGameStore()
  const { tagPositions } = useDataset()

  const tagLabels = useMemo(() => {
    // Count tag frequencies
    const counts: Record<string, number> = {}
    for (const g of games) for (const t of g.tags) counts[t] = (counts[t] || 0) + 1

    // For each tag, compute its average position across games that have it.
    const tagAvgPos: Record<string, { sum: number; count: number }> = {}
    for (const g of games) {
      const pos = tagPositions.get(g.id) ?? 0.5
      for (const t of g.tags) {
        if (!tagAvgPos[t]) tagAvgPos[t] = { sum: 0, count: 0 }
        tagAvgPos[t].sum += pos
        tagAvgPos[t].count++
      }
    }

    // Build tag list with positions, filtering out very rare tags
    const minCount = 3
    const allTags = Object.entries(counts)
      .filter(([, c]) => c >= minCount)
      .map(([tag, count]) => {
        const avg = tagAvgPos[tag]
        return { tag, count, colorPosition: avg ? avg.sum / avg.count : 0.5 }
      })

    // Pick one representative tag per bin across the spectrum.
    // This ensures labels span the full color range.
    const NUM_BINS = 8
    const labels: typeof allTags = []
    for (let bin = 0; bin < NUM_BINS; bin++) {
      const lo = bin / NUM_BINS
      const hi = (bin + 1) / NUM_BINS
      const candidates = allTags.filter(t => t.colorPosition >= lo && t.colorPosition < hi)
      if (candidates.length === 0) continue
      // Pick the most frequent tag in this bin
      candidates.sort((a, b) => b.count - a.count)
      labels.push(candidates[0])
    }

    labels.sort((a, b) => a.colorPosition - b.colorPosition)

    // Evenly space labels across the bar so they never overlap.
    const n = labels.length
    return labels.map((l, i) => ({
      ...l,
      displayPosition: n > 1 ? i / (n - 1) : 0.5,
    }))
  }, [games, tagPositions])

  // Build gradient that matches actual game colors
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
          <span
            key={t.tag}
            className={styles.label}
            style={{ left: `${t.displayPosition * 100}%`, color: hslFromPosition(t.colorPosition) }}
          >
            {t.tag}
          </span>
        ))}
      </div>
    </div>
  )
})
