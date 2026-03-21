import { useMemo, useState, useCallback, useRef } from 'react'
import { line, curveMonotoneX } from 'd3-shape'
import { scaleLinear } from 'd3-scale'
import { useGameStore } from '../store/useGameStore'
import { useDataset } from '../dataset/DatasetContext'
import { buildTagTrends } from '../utils/tagTrends'
import { hslFromPosition } from '../utils/tagColor'
import styles from './TagTrendsView.module.css'

const MARGINS = { left: 50, right: 120, top: 20, bottom: 40 } as const

interface HoverState {
  tag: string
  bucket: number
  count: number
  x: number
  y: number
}

export function TagTrendsView() {
  const { games, dispatch } = useGameStore()
  const { tagIndex, totalTags } = useDataset()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = useState<HoverState | null>(null)
  const [hoveredTag, setHoveredTag] = useState<string | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ width, height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const trends = useMemo(() => buildTagTrends(games), [games])

  const tagColor = useCallback((tag: string) => {
    const idx = tagIndex.get(tag)
    if (idx === undefined) return '#6b6b80'
    return hslFromPosition(idx / totalTags)
  }, [tagIndex, totalTags])

  const { width, height } = size
  const plotW = width - MARGINS.left - MARGINS.right
  const plotH = height - MARGINS.top - MARGINS.bottom

  const xScale = useMemo(() => {
    if (trends.buckets.length < 2) return scaleLinear().domain([0, 1]).range([0, plotW])
    return scaleLinear()
      .domain([trends.buckets[0], trends.buckets[trends.buckets.length - 1]])
      .range([0, plotW])
  }, [trends.buckets, plotW])

  const maxCount = useMemo(() => {
    let max = 0
    for (const t of trends.tags) {
      for (const d of t.data) {
        if (d.count > max) max = d.count
      }
    }
    return max || 1
  }, [trends.tags])

  const yScale = useMemo(() =>
    scaleLinear().domain([0, maxCount]).range([plotH, 0]).nice(),
    [maxCount, plotH],
  )

  const lineFn = useMemo(() =>
    line<{ bucket: number; count: number }>()
      .x(d => xScale(d.bucket))
      .y(d => yScale(d.count))
      .curve(curveMonotoneX),
    [xScale, yScale],
  )

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current
    if (!svg || trends.tags.length === 0) return
    const rect = svg.getBoundingClientRect()
    const mx = e.clientX - rect.left - MARGINS.left
    const my = e.clientY - rect.top - MARGINS.top

    if (mx < 0 || mx > plotW || my < 0 || my > plotH) {
      setHovered(null)
      setHoveredTag(null)
      return
    }

    // Find nearest bucket
    let nearestBucket = trends.buckets[0]
    let nearestDist = Infinity
    for (const b of trends.buckets) {
      const dist = Math.abs(xScale(b) - mx)
      if (dist < nearestDist) {
        nearestDist = dist
        nearestBucket = b
      }
    }

    // Find nearest tag line at this bucket
    let nearestTag = trends.tags[0].tag
    let nearestYDist = Infinity
    let nearestCount = 0
    for (const t of trends.tags) {
      const point = t.data.find(d => d.bucket === nearestBucket)
      if (!point) continue
      const py = yScale(point.count)
      const dist = Math.abs(py - my)
      if (dist < nearestYDist) {
        nearestYDist = dist
        nearestTag = t.tag
        nearestCount = point.count
      }
    }

    setHoveredTag(nearestTag)
    setHovered({
      tag: nearestTag,
      bucket: nearestBucket,
      count: nearestCount,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }, [trends, xScale, yScale, plotW, plotH])

  const handleMouseLeave = useCallback(() => {
    setHovered(null)
    setHoveredTag(null)
  }, [])

  const handleClick = useCallback(() => {
    if (hoveredTag) {
      dispatch({ type: 'SELECT_TAG', tag: hoveredTag })
      dispatch({ type: 'SET_VIEW_MODE', mode: 'timeline' })
    }
  }, [hoveredTag, dispatch])

  const handleLegendEnter = useCallback((tag: string) => {
    setHoveredTag(tag)
  }, [])

  const handleLegendLeave = useCallback(() => {
    setHoveredTag(null)
  }, [])

  const handleLegendClick = useCallback((tag: string) => {
    dispatch({ type: 'SELECT_TAG', tag })
    dispatch({ type: 'SET_VIEW_MODE', mode: 'timeline' })
  }, [dispatch])

  if (width === 0 || height === 0) {
    return <div ref={containerRef} className={styles.container} />
  }

  const yTicks = yScale.ticks(6)

  return (
    <div ref={containerRef} className={styles.container}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <g transform={`translate(${MARGINS.left},${MARGINS.top})`}>
          {/* Y grid lines */}
          {yTicks.map(tick => (
            <line
              key={`grid-${tick}`}
              className={styles.gridLine}
              x1={0}
              y1={yScale(tick)}
              x2={plotW}
              y2={yScale(tick)}
            />
          ))}

          {/* X axis */}
          <line className={styles.axisLine} x1={0} y1={plotH} x2={plotW} y2={plotH} />
          {trends.buckets.map(b => (
            <text
              key={`x-${b}`}
              className={styles.axisText}
              x={xScale(b)}
              y={plotH + 24}
              textAnchor="middle"
            >
              {b}
            </text>
          ))}

          {/* Y axis */}
          <line className={styles.axisLine} x1={0} y1={0} x2={0} y2={plotH} />
          {yTicks.map(tick => (
            <text
              key={`y-${tick}`}
              className={styles.axisText}
              x={-8}
              y={yScale(tick) + 4}
              textAnchor="end"
            >
              {tick}
            </text>
          ))}

          {/* Trend lines */}
          {trends.tags.map(t => {
            const isHovered = hoveredTag === t.tag
            const opacity = hoveredTag === null ? 0.15 : isHovered ? 1 : 0.05
            return (
              <path
                key={t.tag}
                className={`${styles.trendLine}${isHovered ? ` ${styles.trendLineHovered}` : ''}`}
                d={lineFn(t.data) ?? ''}
                stroke={tagColor(t.tag)}
                opacity={opacity}
              />
            )
          })}

          {/* Hover dot */}
          {hovered && (() => {
            const trend = trends.tags.find(t => t.tag === hovered.tag)
            const point = trend?.data.find(d => d.bucket === hovered.bucket)
            if (!trend || !point) return null
            return (
              <circle
                cx={xScale(point.bucket)}
                cy={yScale(point.count)}
                r={4}
                fill={tagColor(hovered.tag)}
                stroke="#fff"
                strokeWidth={1.5}
                style={{ pointerEvents: 'none' }}
              />
            )
          })()}
        </g>
      </svg>

      {/* Legend */}
      <div className={styles.legend}>
        {trends.tags.map(t => (
          <div
            key={t.tag}
            className={`${styles.legendItem}${hoveredTag === t.tag ? ` ${styles.legendItemActive}` : ''}`}
            onMouseEnter={() => handleLegendEnter(t.tag)}
            onMouseLeave={handleLegendLeave}
            onClick={() => handleLegendClick(t.tag)}
          >
            <span className={styles.legendDot} style={{ background: tagColor(t.tag) }} />
            {t.tag}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          className={styles.tooltip}
          style={{ left: hovered.x + 12, top: hovered.y - 30 }}
        >
          <span className={styles.tooltipTag} style={{ color: tagColor(hovered.tag) }}>
            {hovered.tag}
          </span>
          <span className={styles.tooltipCount}>
            {hovered.count} games ({hovered.bucket}–{hovered.bucket + 4})
          </span>
        </div>
      )}
    </div>
  )
}
