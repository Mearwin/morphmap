import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { zoom, zoomIdentity, type ZoomTransform } from 'd3-zoom'
import { select } from 'd3-selection'
import 'd3-transition'
import type { ScaleTime } from 'd3-scale'
import { useGameStore } from '../store/useGameStore'
import { useTimeline } from '../hooks/useTimeline'
import type { GameNode as GameNodeType } from '../types'
import { useDataset } from '../dataset/DatasetContext'
import { TIMELINE, NODE, LINE, LABEL, MINIMAP, THEME } from '../constants'
import { isInViewport } from '../hooks/useViewport'
import { computeLinkLabel, resolveOverlaps, influenceStrokeWidth, type LabelInfo } from '../utils/labelPlacement'
import { computeControlPoint } from '../utils/curve'
import { computeMinimapBounds, computeMinimapLayout, toMinimapX, toMinimapY } from '../utils/minimapLayout'
import { getYear } from '../utils/date'
import { roundRect, roundRectPath } from '../utils/canvas'
import styles from './Timeline.module.css'

const { WIDTH: MAP_W, HEIGHT: MAP_H, BORDER_RADIUS: BORDER_R } = MINIMAP

interface CanvasTimelineProps {
  onHover?: (node: GameNodeType | null, pos: { clientX: number; clientY: number }) => void
}

export function CanvasTimeline({ onHover }: CanvasTimelineProps) {
  const { games, derived, dispatch, state } = useGameStore()
  const { gameColors } = useDataset()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const transformRef = useRef<ZoomTransform>(zoomIdentity)
  const dimensionsRef = useRef({ width: 0, height: 0 })
  const rafRef = useRef<number>(0)
  const hoveredRef = useRef<string | null>(null)
  const zoomRef = useRef<ReturnType<typeof zoom<HTMLCanvasElement, unknown>> | null>(null)
  const hoverRafRef = useRef<number>(0)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Data refs — updated via effect so the stable draw function always reads current values
  const dataRef = useRef<{
    filteredNodes: GameNodeType[]
    filteredLinks: typeof links
    linkLabels: LabelInfo[]
    nodeMap: Map<string, GameNodeType>
    nodes: GameNodeType[]
    selectedGameId: string | null
    derived: typeof derived
    xScale: ScaleTime<number, number>
    gameColors: Map<string, string>
  }>(null!)

  const { selectedGameId, selectedTag, timeRange } = state

  const { nodes, xScale, settled, initialNodes } = useTimeline(
    games,
    dimensions.width || window.innerWidth,
    dimensions.height || window.innerHeight,
  )
  const ready = nodes.length > 0
  const { links } = derived

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  // Determine visible nodes based on filters
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      const isTagVisible = !selectedTag || n.tags.includes(selectedTag)
      const year = getYear(n.date)
      const isTimeVisible = !timeRange || (year >= timeRange.from && year <= timeRange.to)
      return isTagVisible && isTimeVisible
    })
  }, [nodes, selectedTag, timeRange])

  const filteredLinks = useMemo(() => {
    return links.filter(l => {
      const isTagVisible = !selectedTag || l.through.includes(selectedTag)
      if (!isTagVisible) return false
      const source = nodeMap.get(l.source)
      const target = nodeMap.get(l.target)
      if (!source || !target) return false
      const sourceYear = getYear(source.date)
      const targetYear = getYear(target.date)
      const isTimeVisible = !timeRange
        || ((sourceYear >= timeRange.from && sourceYear <= timeRange.to)
          && (targetYear >= timeRange.from && targetYear <= timeRange.to))
      return isTimeVisible
    })
  }, [links, selectedTag, timeRange, nodeMap])

  // Link labels for selected game
  const linkLabels = useMemo(() => {
    if (!selectedGameId || !derived.connectedSet) return []
    const raw: LabelInfo[] = []
    for (const link of filteredLinks) {
      const source = nodeMap.get(link.source)
      const target = nodeMap.get(link.target)
      if (!source || !target) continue
      if (!derived.connectedSet.has(source.id) || !derived.connectedSet.has(target.id)) continue
      raw.push(computeLinkLabel(source, target, link.through))
    }
    return resolveOverlaps(raw)
  }, [selectedGameId, filteredLinks, derived.connectedSet, nodeMap])

  // Update data ref so the stable draw function always reads current values
  useEffect(() => {
    dataRef.current = { filteredNodes, filteredLinks, linkLabels, nodeMap, nodes, selectedGameId, derived, xScale, gameColors }
  })

  // Stable draw function — reads all mutable data from refs, never changes identity
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { filteredNodes, filteredLinks, linkLabels, nodeMap, nodes, selectedGameId, derived, xScale, gameColors } = dataRef.current
    const dpr = window.devicePixelRatio || 1
    const { width, height } = dimensionsRef.current
    const transform = transformRef.current

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = THEME.bg
    ctx.fillRect(0, 0, width, height)

    // Compute viewport bounds for culling (with margin for nodes)
    const invK = 1 / transform.k
    const minX = -transform.x * invK - 100
    const minY = -transform.y * invK - 100
    const maxX = (width - transform.x) * invK + 100
    const maxY = (height - transform.y) * invK + 100
    const viewport = { minX, maxX, minY, maxY }
    // Tight viewport for links (no margin)
    const linkViewport = {
      minX: -transform.x * invK,
      minY: -transform.y * invK,
      maxX: (width - transform.x) * invK,
      maxY: (height - transform.y) * invK,
    }

    // Apply zoom transform
    ctx.save()
    ctx.translate(transform.x * dpr, transform.y * dpr)
    ctx.scale(transform.k * dpr, transform.k * dpr)

    // Draw time axis
    drawTimeAxis(ctx, xScale, height / transform.k)

    // Draw links
    for (const link of filteredLinks) {
      const source = nodeMap.get(link.source)
      const target = nodeMap.get(link.target)
      if (!source || !target) continue
      if (!isInViewport(source.x, source.y, linkViewport) && !isInViewport(target.x, target.y, linkViewport)) continue

      const isHighlighted = selectedGameId != null
        && (derived.connectedLinks?.has(`${source.id}->${target.id}`) ?? false)
      const opacity = selectedGameId
        ? (isHighlighted ? LINE.OPACITY_HIGHLIGHTED : LINE.OPACITY_DIMMED)
        : LINE.OPACITY_DEFAULT
      const baseWidth = influenceStrokeWidth(link.through.length)
      const strokeWidth = isHighlighted ? baseWidth * (LINE.STROKE_HIGHLIGHTED / LINE.STROKE_DEFAULT) : baseWidth

      const { midX, controlY } = computeControlPoint(source, target)

      ctx.globalAlpha = opacity
      ctx.strokeStyle = THEME.textMuted
      ctx.lineWidth = strokeWidth
      ctx.beginPath()
      ctx.moveTo(source.x, source.y)
      ctx.quadraticCurveTo(midX, controlY, target.x, target.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Draw nodes
    for (const node of filteredNodes) {
      if (!isInViewport(node.x, node.y, viewport)) continue

      const isSelected = node.id === selectedGameId
      const isHighlighted = !selectedGameId || node.id === selectedGameId
        || (derived.connectedSet?.has(node.id) ?? false)
      const isHovered = node.id === hoveredRef.current
      const opacity = isHighlighted ? 1 : 0.1
      const color = gameColors.get(node.id) ?? THEME.textMuted
      const radius = isSelected ? node.radius * NODE.SELECTED_SCALE : node.radius

      ctx.globalAlpha = opacity

      // Node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = isHovered ? lighten(color) : color
      ctx.fill()
      if (isSelected) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = NODE.STROKE_SELECTED
      } else {
        ctx.strokeStyle = color
        ctx.lineWidth = NODE.STROKE_DEFAULT
      }
      ctx.stroke()

      // Label
      const fontSize = isSelected ? parseInt(NODE.FONT_SIZE_SELECTED) : parseInt(NODE.FONT_SIZE_DEFAULT)
      const fontWeight = isSelected ? NODE.FONT_WEIGHT_SELECTED : NODE.FONT_WEIGHT_DEFAULT
      ctx.font = `${fontWeight} ${fontSize}px Inter, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillStyle = isSelected ? THEME.text : THEME.textMuted

      // Text shadow
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetY = 1
      ctx.fillText(node.title, node.x, node.y - node.radius * 2 + NODE.LABEL_OFFSET)
      ctx.restore()
    }
    ctx.globalAlpha = 1

    // Draw link labels
    for (const label of linkLabels) {
      if (!isInViewport(label.x, label.y, viewport)) continue

      // Pill background
      const pillX = label.x - label.width / 2
      const pillY = label.y - LABEL.PILL_HALF_HEIGHT
      ctx.globalAlpha = LABEL.PILL_OPACITY
      ctx.fillStyle = THEME.surface
      ctx.strokeStyle = THEME.border
      ctx.lineWidth = LABEL.PILL_STROKE_WIDTH
      roundRect(ctx, pillX, pillY, label.width, LABEL.HEIGHT, LABEL.PILL_RADIUS)
      ctx.fill()
      ctx.stroke()

      // Pill text
      ctx.globalAlpha = 1
      ctx.font = `${LABEL.FONT_WEIGHT} ${LABEL.FONT_SIZE}px Inter, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = THEME.accent
      ctx.fillText(label.text, label.x, label.y + LABEL.TEXT_Y_OFFSET - LABEL.PILL_HALF_HEIGHT + LABEL.HEIGHT / 2)
    }

    ctx.restore() // pop zoom transform

    // Draw minimap (in screen space)
    if (nodes.length > 0) {
      drawMinimap(ctx, nodes, transform, width, height, gameColors)
    }
  }, []) // stable — reads everything from refs

  const scheduleRedraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(draw)
  }, [draw])

  // Redraw when data changes
  useEffect(() => {
    scheduleRedraw()
  }, [filteredNodes, filteredLinks, linkLabels, nodeMap, nodes, selectedGameId, derived, xScale, scheduleRedraw])

  // Resize handling via ResizeObserver on container
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      const { width: w, height: h } = entry.contentRect
      const dims = { width: w, height: h }
      dimensionsRef.current = dims
      setDimensions(dims)
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

  // Setup zoom
  useEffect(() => {
    if (!canvasRef.current) return

    const sel = select(canvasRef.current)
    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([TIMELINE.ZOOM_MIN, TIMELINE.ZOOM_MAX])
      .on('zoom', (event) => {
        transformRef.current = event.transform
        scheduleRedraw()
      })

    zoomRef.current = zoomBehavior
    sel.call(zoomBehavior)

    return () => {
      sel.on('.zoom', null)
      zoomRef.current = null
    }
  }, [scheduleRedraw])

  // --- Initial fit-all: runs immediately from pre-simulation positions ---
  const didInitialFitRef = useRef(false)

  useEffect(() => {
    if (didInitialFitRef.current || selectedGameId || !initialNodes || !canvasRef.current || !zoomRef.current) return
    const { width, height } = dimensionsRef.current
    if (width === 0 || height === 0) return

    didInitialFitRef.current = true

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const n of initialNodes.values()) {
      if (n.x < minX) minX = n.x
      if (n.x > maxX) maxX = n.x
      if (n.y < minY) minY = n.y
      if (n.y > maxY) maxY = n.y
    }

    const padding = 40
    const bboxW = maxX - minX || 1
    const bboxH = maxY - minY || 1
    const scale = Math.min(
      (width - padding * 2) / bboxW,
      (height - padding * 2) / bboxH,
      TIMELINE.ZOOM_MAX,
    )
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const tx = width / 2 - cx * scale
    const ty = height / 2 - cy * scale

    select(canvasRef.current)
      .call(zoomRef.current.transform, zoomIdentity.translate(tx, ty).scale(scale))
  }, [initialNodes, selectedGameId])

  // --- Zoom to selected game: use initialNodes for immediate zoom, no wait ---
  const lastZoomedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!selectedGameId || !canvasRef.current || !zoomRef.current) return

    const node = initialNodes?.get(selectedGameId) ?? nodeMap.get(selectedGameId)
    if (!node) return

    if (lastZoomedIdRef.current === selectedGameId) return
    lastZoomedIdRef.current = selectedGameId
    didInitialFitRef.current = true

    const { width, height } = dimensionsRef.current
    if (width === 0 || height === 0) return

    const targetK = 1.5
    const targetX = width / 2 - node.x * targetK
    const targetY = height / 2 - node.y * targetK
    const targetTransform = zoomIdentity.translate(targetX, targetY).scale(targetK)

    select(canvasRef.current)
      .transition()
      .duration(500)
      .call(zoomRef.current.transform, targetTransform)
  }, [selectedGameId, initialNodes, nodeMap])

  useEffect(() => {
    if (!selectedGameId) lastZoomedIdRef.current = null
  }, [selectedGameId])

  // Hit testing for click/hover
  const hitTest = useCallback((clientX: number, clientY: number): GameNodeType | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const screenX = clientX - rect.left
    const screenY = clientY - rect.top
    const transform = transformRef.current

    // Convert screen to world coordinates
    const worldX = (screenX - transform.x) / transform.k
    const worldY = (screenY - transform.y) / transform.k

    // Find closest node within click radius
    const hitRadius = Math.max(NODE.RADIUS * 2, 12 / transform.k)
    let closest: GameNodeType | null = null
    let closestDist = Infinity

    for (const node of filteredNodes) {
      const dx = node.x - worldX
      const dy = node.y - worldY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < hitRadius && dist < closestDist) {
        closest = node
        closestDist = dist
      }
    }
    return closest
  }, [filteredNodes])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const hit = hitTest(e.clientX, e.clientY)
    dispatch({ type: 'SELECT_GAME', id: hit ? (hit.id === selectedGameId ? null : hit.id) : null })
  }, [hitTest, dispatch, selectedGameId])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Throttle hit testing to once per animation frame
    if (hoverRafRef.current) return
    const clientX = e.clientX
    const clientY = e.clientY
    hoverRafRef.current = requestAnimationFrame(() => {
      hoverRafRef.current = 0
      const hit = hitTest(clientX, clientY)
      const prevHovered = hoveredRef.current
      hoveredRef.current = hit?.id ?? null

      if (canvasRef.current) {
        canvasRef.current.style.cursor = hit ? 'pointer' : ''
      }

      if (hit?.id !== prevHovered) {
        scheduleRedraw()
      }

      if (onHover) {
        onHover(hit, { clientX, clientY })
      }
    })
  }, [hitTest, onHover, scheduleRedraw])

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    cancelAnimationFrame(hoverRafRef.current)
    hoverRafRef.current = 0
    if (hoveredRef.current) {
      hoveredRef.current = null
      scheduleRedraw()
    }
    onHover?.(null, { clientX: e.clientX, clientY: e.clientY })
  }, [onHover, scheduleRedraw])

  return (
    <div ref={containerRef} className={styles.container}>
      {!ready && <div className={styles.loading}>Loading graph...</div>}
      <canvas
        ref={canvasRef}
        className={`${styles.svg}${ready ? ` ${styles.ready}` : ''}`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="img"
        aria-label="Interactive timeline of video game influences. Use mouse to zoom and pan, click nodes to explore connections."
      />
    </div>
  )
}

function drawTimeAxis(ctx: CanvasRenderingContext2D, xScale: ScaleTime<number, number>, height: number) {
  const ticks = xScale.ticks(10)

  for (const tick of ticks) {
    const x = xScale(tick)

    // Tick line
    ctx.strokeStyle = THEME.border
    ctx.lineWidth = 1
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
    ctx.setLineDash([])

    // Tick label
    const year = tick.getFullYear()
    ctx.fillStyle = THEME.textMuted
    ctx.font = '11px Inter, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(String(year), x, height - 20)
  }
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  nodes: GameNodeType[],
  transform: ZoomTransform,
  viewWidth: number,
  viewHeight: number,
  gameColors: Map<string, string>,
) {
  const bounds = computeMinimapBounds(nodes)
  const { offsetX, offsetY, scaleX, scaleY, viewportRect } = computeMinimapLayout(bounds, transform, viewWidth, viewHeight, 280)

  // Background
  ctx.globalAlpha = 0.92
  ctx.fillStyle = THEME.surface
  ctx.strokeStyle = THEME.border
  ctx.lineWidth = 1
  roundRect(ctx, offsetX, offsetY, MAP_W, MAP_H, BORDER_R)
  ctx.fill()
  ctx.stroke()
  ctx.globalAlpha = 1

  // Clip (manual via save/restore + path)
  ctx.save()
  ctx.beginPath()
  roundRectPath(ctx, offsetX, offsetY, MAP_W, MAP_H, BORDER_R)
  ctx.clip()

  // Mini nodes
  ctx.globalAlpha = 0.7
  for (const n of nodes) {
    const cx = offsetX + toMinimapX(n.x, bounds, scaleX)
    const cy = offsetY + toMinimapY(n.y, bounds, scaleY)
    ctx.fillStyle = gameColors.get(n.id) ?? THEME.textMuted
    ctx.beginPath()
    ctx.arc(cx, cy, 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Viewport rect
  ctx.fillStyle = THEME.accentDim
  ctx.strokeStyle = THEME.accent
  ctx.lineWidth = 1
  roundRect(ctx, offsetX + viewportRect.x, offsetY + viewportRect.y, viewportRect.w, viewportRect.h, 1)
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}

function lighten(color: string): string {
  // Handle HSL strings from tagColor system
  const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (hslMatch) {
    const h = hslMatch[1]
    const s = hslMatch[2]
    const l = Math.min(100, parseInt(hslMatch[3]) + 15)
    return `hsl(${h}, ${s}%, ${l}%)`
  }
  // Fallback: hex lighten by blending toward white ~30%
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  const blend = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.3))
  return `rgb(${blend(r)},${blend(g)},${blend(b)})`
}
