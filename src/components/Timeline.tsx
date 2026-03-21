import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { zoom, zoomIdentity, type ZoomTransform } from 'd3-zoom'
import { select } from 'd3-selection'
import 'd3-transition'
import { axisBottom } from 'd3-axis'
import type { ScaleTime } from 'd3-scale'
import { useGameStore } from '../store/useGameStore'
import { useTimeline } from '../hooks/useTimeline'
import { useContainerSize } from '../hooks/useContainerSize'
import type { GameNode as GameNodeType } from '../types'
import { GameNode } from './GameNode'
import { InfluenceLine } from './InfluenceLine'
import { Minimap } from './Minimap'
import { useDataset } from '../dataset/DatasetContext'
import { TIMELINE, LABEL, LINE, THEME } from '../constants'
import { useViewport, isInViewport } from '../hooks/useViewport'
import { computeLinkLabel } from '../utils/labelPlacement'
import { getYear } from '../utils/date'
import { CanvasTimeline } from './CanvasTimeline'
import { InfluenceRiver } from './InfluenceRiver'
import styles from './Timeline.module.css'

export interface HoverPos { clientX: number; clientY: number }

interface TimelineProps {
  onHover?: (node: GameNodeType | null, pos: HoverPos) => void
}

export function Timeline({ onHover }: TimelineProps = {}) {
  const { games, state } = useGameStore()

  if (state.viewMode === 'river') {
    return <InfluenceRiver />
  }

  if (games.length >= TIMELINE.CANVAS_THRESHOLD) {
    return <CanvasTimeline onHover={onHover} />
  }

  return <SvgTimeline onHover={onHover} />
}

function SvgTimeline({ onHover }: TimelineProps) {
  const { games, derived, dispatch, state } = useGameStore()
  const { gameColors } = useDataset()
  const { selectedGameId, selectedTag, timeRange } = state
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ReturnType<typeof zoom<SVGSVGElement, unknown>> | null>(null)
  const dimensions = useContainerSize(containerRef)
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)

  const { nodes, xScale, initialNodes } = useTimeline(games, dimensions.width, dimensions.height)
  const ready = nodes.length > 0
  const { links, connectedSet, connectedLinks } = derived

  useEffect(() => {
    if (!svgRef.current) return

    const svg = select(svgRef.current)
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([TIMELINE.ZOOM_MIN, TIMELINE.ZOOM_MAX])
      .on('zoom', (event) => {
        setTransform(event.transform)
      })

    zoomRef.current = zoomBehavior
    svg.call(zoomBehavior)

    return () => {
      svg.on('.zoom', null)
      zoomRef.current = null
    }
  }, [])

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === svgRef.current) {
        dispatch({ type: 'SELECT_GAME', id: null })
      }
    },
    [dispatch]
  )

  const handleSelectGame = useCallback(
    (id: string | null) => {
      dispatch({ type: 'SELECT_GAME', id })
    },
    [dispatch]
  )

  const viewport = useViewport(transform, dimensions.width, dimensions.height)

  const visibleNodes = useMemo(
    () => nodes.filter(n => isInViewport(n.x, n.y, viewport)),
    [nodes, viewport],
  )

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map(n => n.id)),
    [visibleNodes],
  )

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  // --- Initial fit-all: runs immediately from pre-simulation positions ---
  const didInitialFitRef = useRef(false)

  useEffect(() => {
    if (didInitialFitRef.current || selectedGameId || !initialNodes || !svgRef.current || !zoomRef.current) return
    const { width, height } = dimensions
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

    select(svgRef.current)
      .call(zoomRef.current.transform, zoomIdentity.translate(tx, ty).scale(scale))
  }, [initialNodes, dimensions, selectedGameId])

  // --- Zoom to selected game: use initialNodes for immediate zoom, no wait ---
  const lastZoomedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!selectedGameId || !svgRef.current || !zoomRef.current) return

    // Use initialNodes (instant) or fall back to nodeMap (after sim ticks)
    const node = initialNodes?.get(selectedGameId) ?? nodeMap.get(selectedGameId)
    if (!node) return

    // Skip if we already zoomed to this game at roughly the same position
    if (lastZoomedIdRef.current === selectedGameId) return
    lastZoomedIdRef.current = selectedGameId
    didInitialFitRef.current = true

    const { width, height } = dimensions
    if (width === 0 || height === 0) return

    const targetK = 1.5
    const targetX = width / 2 - node.x * targetK
    const targetY = height / 2 - node.y * targetK
    const targetTransform = zoomIdentity.translate(targetX, targetY).scale(targetK)

    select(svgRef.current)
      .transition()
      .duration(500)
      .call(zoomRef.current.transform, targetTransform)
  }, [selectedGameId, initialNodes, nodeMap, dimensions])

  // Reset tracking when game is deselected
  useEffect(() => {
    if (!selectedGameId) lastZoomedIdRef.current = null
  }, [selectedGameId])

  const [hoveredLink, setHoveredLink] = useState<{ source: string; target: string } | null>(null)

  const handleHoverLink = useCallback((source: string, target: string) => {
    setHoveredLink({ source, target })
  }, [])

  const handleLeaveLink = useCallback(() => {
    setHoveredLink(null)
  }, [])

  const hoveredLabel = useMemo(() => {
    if (!hoveredLink) return null
    const source = nodeMap.get(hoveredLink.source)
    const target = nodeMap.get(hoveredLink.target)
    if (!source || !target) return null
    const link = links.find(l => l.source === hoveredLink.source && l.target === hoveredLink.target)
    if (!link) return null
    return computeLinkLabel(source, target, link.through)
  }, [hoveredLink, nodeMap, links])

  return (
    <div ref={containerRef} className={styles.container}>
    {!ready && <div className={styles.loading}>Loading graph...</div>}
    <svg
      ref={svgRef}
      className={`${styles.svg}${ready ? ` ${styles.ready}` : ''}`}
      width={dimensions.width}
      height={dimensions.height}
      onClick={handleBackgroundClick}
      role="img"
      aria-label="Interactive timeline of video game influences. Use mouse to zoom and pan, click nodes to explore connections."
    >
      <defs>
        <pattern id="bg-dots" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="0.5" fill="var(--text-muted)" opacity="0.15" />
        </pattern>
      </defs>
      <g transform={transform.toString()}>
        <rect x="-1e5" y="-1e5" width="2e5" height="2e5" fill="url(#bg-dots)" />
        <TimeAxis xScale={xScale} height={dimensions.height} />

        {links.map(link => {
          const source = nodeMap.get(link.source)
          const target = nodeMap.get(link.target)
          if (!source || !target) return null
          if (!visibleNodeIds.has(source.id) && !visibleNodeIds.has(target.id)) return null

          const isTagVisible = !selectedTag || link.through.includes(selectedTag)
          const sourceYear = getYear(source.date)
          const targetYear = getYear(target.date)
          const isTimeVisible = !timeRange
            || ((sourceYear >= timeRange.from && sourceYear <= timeRange.to)
              && (targetYear >= timeRange.from && targetYear <= timeRange.to))
          if (!isTagVisible || !isTimeVisible) return null

          const isHighlighted = selectedGameId != null
            && (connectedLinks?.has(`${source.id}->${target.id}`) ?? false)
          const opacity = selectedGameId
            ? (isHighlighted ? LINE.OPACITY_HIGHLIGHTED : LINE.OPACITY_DIMMED)
            : LINE.OPACITY_DEFAULT

          const isLinkHovered = hoveredLink?.source === source.id && hoveredLink?.target === target.id

          return (
            <InfluenceLine
              key={`${link.source}-${link.target}`}
              source={source}
              target={target}
              through={link.through}
              opacity={opacity}
              isHighlighted={isHighlighted}
              isHovered={isLinkHovered}
              onHoverLink={isHighlighted ? handleHoverLink : undefined}
              onLeaveLink={isHighlighted ? handleLeaveLink : undefined}
            />
          )
        })}

        {visibleNodes.map(node => {
          const isTagVisible = !selectedTag || node.tags.includes(selectedTag)
          const year = getYear(node.date)
          const isTimeVisible = !timeRange || (year >= timeRange.from && year <= timeRange.to)
          if (!isTagVisible || !isTimeVisible) return null

          const isSelected = node.id === selectedGameId
          const isHighlighted = !selectedGameId || isSelected || (connectedSet?.has(node.id) ?? false)

          return (
            <GameNode
              key={node.id}
              node={node}
              color={gameColors.get(node.id) ?? '#6b6b80'}
              isSelected={isSelected}
              isHighlighted={isHighlighted}
              onSelect={handleSelectGame}
              onHover={onHover}
            />
          )
        })}

        {hoveredLabel && (
          <g pointerEvents="none">
            <rect
              x={hoveredLabel.x - hoveredLabel.width / 2}
              y={hoveredLabel.y - LABEL.PILL_HALF_HEIGHT}
              width={hoveredLabel.width}
              height={LABEL.HEIGHT}
              rx={LABEL.PILL_RADIUS}
              fill="var(--surface)"
              stroke="var(--border)"
              strokeWidth={LABEL.PILL_STROKE_WIDTH}
              opacity={LABEL.PILL_OPACITY}
            />
            <text
              x={hoveredLabel.x}
              y={hoveredLabel.y + LABEL.TEXT_Y_OFFSET}
              textAnchor="middle"
              fontSize={LABEL.FONT_SIZE}
              fontWeight={LABEL.FONT_WEIGHT}
              fill="var(--accent)"
            >
              {hoveredLabel.text}
            </text>
          </g>
        )}
      </g>

      {nodes.length > 0 && (
        <Minimap
          nodes={nodes}
          gameColors={gameColors}
          transform={transform}
          viewWidth={dimensions.width}
          viewHeight={dimensions.height}
        />
      )}
    </svg>
    </div>
  )
}

function TimeAxis({ xScale, height }: { xScale: ScaleTime<number, number>; height: number }) {
  const ref = useRef<SVGGElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const axis = axisBottom(xScale).ticks(10).tickSize(height).tickPadding(10)
    select(ref.current)
      .call(axis)
      .call(g => g.select('.domain').remove())
      .call(g =>
        g
          .selectAll('.tick line')
          .attr('stroke', THEME.border)
          .attr('stroke-dasharray', '2,4')
      )
      .call(g =>
        g.selectAll('.tick text').attr('fill', THEME.textMuted).attr('font-size', '11px')
      )
  }, [xScale, height])

  return <g ref={ref} />
}
