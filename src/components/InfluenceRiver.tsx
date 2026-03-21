import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { stack, area, curveMonotoneX, stackOffsetWiggle, stackOrderInsideOut } from 'd3-shape'
import { scaleLinear } from 'd3-scale'
import { useGameStore } from '../store/useGameStore'
import { useDataset } from '../dataset/DatasetContext'
import { buildLinks } from '../utils/graph'
import { buildRiverData, type EraCategoryCell } from '../utils/riverData'
import { hslFromPosition } from '../utils/tagColor'
import { THEME } from '../constants'
import { RiverPopover } from './RiverPopover'
import { roundRect } from '../utils/canvas'
import styles from './InfluenceRiver.module.css'

const MARGINS = { left: 40, right: 40, top: 30, bottom: 50 } as const

type PopoverState = {
  tagId: string
  tagLabel: string
  tagColor: string
  eraLabel: string
  cell: EraCategoryCell
  x: number
  y: number
}

type HoverState = {
  categoryId: string
  eraIndex: number
} | null

export function InfluenceRiver() {
  const { games, state, dispatch } = useGameStore()
  const { tagIndex, totalTags } = useDataset()
  const { selectedTag } = state
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef<() => void>(() => {})
  const rafRef = useRef<number>(0)
  const dimensionsRef = useRef({ width: 0, height: 0 })
  const hoverRef = useRef<HoverState>(null)
  const [popover, setPopover] = useState<PopoverState | null>(null)

  const links = useMemo(() => buildLinks(games), [games])
  const riverData = useMemo(
    () => buildRiverData(games, links, selectedTag),
    [games, links, selectedTag],
  )

  // Compute tag colors for streams using spectral ordering (same as timeline)
  const tagColorMap = useMemo(() => {
    const colors = new Map<string, string>()
    for (const [tag, idx] of tagIndex) {
      colors.set(tag, hslFromPosition(idx / totalTags))
    }
    return colors
  }, [tagIndex, totalTags])

  // Build D3 stack data
  const stackData = useMemo(() => {
    const { slices, categoryIds } = riverData

    const rows = slices.map(slice => {
      const row: Record<string, number> = { eraMid: slice.eraMid }
      for (const catId of categoryIds) {
        row[catId] = slice.byCategory[catId].count
      }
      return row
    })

    const s = stack<Record<string, number>>()
      .keys(categoryIds)
      .offset(stackOffsetWiggle)
      .order(stackOrderInsideOut)

    return s(rows)
  }, [riverData])

  // Memoize data-dependent scale inputs (shared between draw and hitTest)
  const scaleParams = useMemo(() => {
    const { slices } = riverData
    const eraMids = slices.map(s => s.eraMid)
    let yMin = Infinity
    let yMax = -Infinity
    for (const layer of stackData) {
      for (const point of layer) {
        if (point[0] < yMin) yMin = point[0]
        if (point[1] > yMax) yMax = point[1]
      }
    }
    const yPad = (yMax - yMin) * 0.08 || 1
    return { eraMids, yMin: yMin - yPad, yMax: yMax + yPad }
  }, [riverData, stackData])

  function buildScales(width: number, height: number) {
    const plotW = width - MARGINS.left - MARGINS.right
    const plotH = height - MARGINS.top - MARGINS.bottom
    const { eraMids, yMin, yMax } = scaleParams
    const xScale = scaleLinear()
      .domain([eraMids[0], eraMids[eraMids.length - 1]])
      .range([MARGINS.left, MARGINS.left + plotW])
    const yScale = scaleLinear()
      .domain([yMin, yMax])
      .range([MARGINS.top + plotH, MARGINS.top])
    return { xScale, yScale, plotW, plotH, eraMids }
  }

  const scheduleRedraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => drawRef.current())
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const { width, height } = dimensionsRef.current
    if (width === 0 || height === 0) return

    const { slices } = riverData
    const hovered = hoverRef.current

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = THEME.bg
    ctx.fillRect(0, 0, width, height)

    const { xScale, yScale, plotW, plotH, eraMids } = buildScales(width, height)

    const areaGen = area<[number, number]>()
      .x((_d, i) => xScale(eraMids[i]))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(curveMonotoneX)
      .context(ctx)

    for (let layerIdx = 0; layerIdx < stackData.length; layerIdx++) {
      const layer = stackData[layerIdx]
      const catId = layer.key
      const isHovered = hovered?.categoryId === catId
      const hasHover = hovered !== null
      ctx.globalAlpha = hasHover ? (isHovered ? 1 : 0.25) : 0.85
      ctx.fillStyle = tagColorMap.get(catId) ?? THEME.textMuted
      ctx.beginPath()
      areaGen(layer as [number, number][])
      ctx.fill()
    }
    ctx.globalAlpha = 1

    ctx.fillStyle = THEME.textMuted
    ctx.font = '11px Inter, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    for (const slice of slices) {
      const x = xScale(slice.eraMid)
      ctx.strokeStyle = THEME.border
      ctx.lineWidth = 1
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(x, MARGINS.top)
      ctx.lineTo(x, MARGINS.top + plotH)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = THEME.textMuted
      ctx.fillText(String(slice.eraStart), x, MARGINS.top + plotH + 10)
    }

    if (hovered) {
      const slice = slices[hovered.eraIndex]
      const catLabel = hovered.categoryId
      const cell = slice?.byCategory[hovered.categoryId]
      if (slice && cell) {
        const x = xScale(slice.eraMid)
        const layer = stackData.find(l => l.key === hovered.categoryId)
        if (layer) {
          const point = layer[hovered.eraIndex]
          const y = yScale((point[0] + point[1]) / 2)
          const text = `${catLabel} \u2014 ${cell.count} influence${cell.count !== 1 ? 's' : ''}`
          const textWidth = ctx.measureText(text).width + 16
          ctx.fillStyle = THEME.surface
          ctx.strokeStyle = THEME.border
          ctx.lineWidth = 1
          roundRect(ctx, x - textWidth / 2, y - 24, textWidth, 22, 4)
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = THEME.text
          ctx.font = '12px Inter, -apple-system, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(text, x, y - 13)
        }
      }
    }
  }, [riverData, stackData, tagColorMap])

  useEffect(() => {
    drawRef.current = draw
    scheduleRedraw()
  }, [draw, scheduleRedraw])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      const { width: w, height: h } = entry.contentRect
      dimensionsRef.current = { width: w, height: h }
      if (canvasRef.current) {
        const dpr = window.devicePixelRatio || 1
        canvasRef.current.width = w * dpr
        canvasRef.current.height = h * dpr
        canvasRef.current.style.width = `${w}px`
        canvasRef.current.style.height = `${h}px`
      }
      scheduleRedraw()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [scheduleRedraw])

  const hitTest = useCallback((clientX: number, clientY: number): HoverState => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const screenX = clientX - rect.left
    const screenY = clientY - rect.top
    const { width, height } = dimensionsRef.current
    const { xScale, yScale, plotW, plotH, eraMids } = buildScales(width, height)
    let bestEraIdx = 0
    let bestEraDist = Infinity
    for (let i = 0; i < eraMids.length; i++) {
      const dist = Math.abs(xScale(eraMids[i]) - screenX)
      if (dist < bestEraDist) { bestEraDist = dist; bestEraIdx = i }
    }
    if (screenX < MARGINS.left - 10 || screenX > MARGINS.left + plotW + 10) return null
    if (screenY < MARGINS.top || screenY > MARGINS.top + plotH) return null
    for (const layer of stackData) {
      const point = layer[bestEraIdx]
      const y0 = yScale(point[0])
      const y1 = yScale(point[1])
      const top = Math.min(y0, y1)
      const bottom = Math.max(y0, y1)
      if (screenY >= top && screenY <= bottom) {
        return { categoryId: layer.key, eraIndex: bestEraIdx }
      }
    }
    return null
  }, [stackData, scaleParams])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const hit = hitTest(e.clientX, e.clientY)
    const prev = hoverRef.current
    if (hit?.categoryId !== prev?.categoryId || hit?.eraIndex !== prev?.eraIndex) {
      hoverRef.current = hit
      if (canvasRef.current) { canvasRef.current.style.cursor = hit ? 'pointer' : '' }
      scheduleRedraw()
    }
  }, [hitTest, scheduleRedraw])

  const handleMouseLeave = useCallback(() => {
    if (hoverRef.current) { hoverRef.current = null; scheduleRedraw() }
  }, [scheduleRedraw])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const hit = hitTest(e.clientX, e.clientY)
    if (!hit) { setPopover(null); return }
    const slice = riverData.slices[hit.eraIndex]
    if (!slice) return
    const cell = slice.byCategory[hit.categoryId]
    setPopover({
      tagId: hit.categoryId,
      tagLabel: hit.categoryId,
      tagColor: tagColorMap.get(hit.categoryId) ?? '#6b7280',
      eraLabel: slice.eraLabel,
      cell,
      x: e.clientX + 12,
      y: e.clientY - 12,
    })
  }, [hitTest, riverData, tagColorMap])

  const handlePopoverSelectGame = useCallback((id: string) => {
    setPopover(null)
    dispatch({ type: 'SET_VIEW_MODE', mode: 'timeline' })
    dispatch({ type: 'SELECT_GAME', id })
  }, [dispatch])

  return (
    <div ref={containerRef} className={styles.container}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="img"
        aria-label="Influence river chart showing how influence connections flow into each tag over time."
      />
      {popover && (
        <RiverPopover
          tagId={popover.tagId}
          tagLabel={popover.tagLabel}
          tagColor={popover.tagColor}
          eraLabel={popover.eraLabel}
          cell={popover.cell}
          x={popover.x}
          y={popover.y}
          onClose={() => setPopover(null)}
          onSelectGame={handlePopoverSelectGame}
        />
      )}
    </div>
  )
}
