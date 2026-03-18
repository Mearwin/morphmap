import { useMemo, useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '../store/useGameStore'
import { buildLineageData } from '../utils/lineageLayout'
import { LineageCard } from './LineageCard'
import styles from './LineageView.module.css'

export function LineageView() {
  const { state, games, derived, dispatch } = useGameStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map())
  const svgRef = useRef<SVGSVGElement>(null)

  const gameMap = useMemo(() => new Map(games.map(g => [g.id, g])), [games])

  const lineage = useMemo(() => {
    if (!state.selectedGameId) return null
    return buildLineageData(state.selectedGameId, gameMap, derived.links, derived.adjacency)
  }, [state.selectedGameId, gameMap, derived.links, derived.adjacency])

  const handleCardClick = useCallback((id: string) => {
    // Deselect then reselect to trigger lineage rebuild around new center
    dispatch({ type: 'SELECT_GAME', id: null })
    requestAnimationFrame(() => {
      dispatch({ type: 'SELECT_GAME', id })
    })
  }, [dispatch])

  // Scroll to center the selected column on mount/recenter
  useEffect(() => {
    if (!state.selectedGameId || !containerRef.current) return
    const selectedCard = cardRefs.current.get(state.selectedGameId)
    if (selectedCard) {
      selectedCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'center' })
    }
  }, [state.selectedGameId])

  // Draw SVG connectors after layout
  useEffect(() => {
    if (!lineage || !svgRef.current || !containerRef.current) return
    const svg = svgRef.current
    const container = containerRef.current

    // Clear previous paths
    while (svg.firstChild) svg.removeChild(svg.firstChild)

    // Match SVG size to scroll content
    const scrollW = container.scrollWidth
    const scrollH = container.scrollHeight
    svg.setAttribute('width', String(scrollW))
    svg.setAttribute('height', String(scrollH))
    svg.style.width = `${scrollW}px`
    svg.style.height = `${scrollH}px`

    for (const edge of lineage.edges) {
      const fromEl = cardRefs.current.get(edge.from)
      const toEl = cardRefs.current.get(edge.to)
      if (!fromEl || !toEl) continue

      const containerRect = container.getBoundingClientRect()
      const scrollLeft = container.scrollLeft
      const scrollTop = container.scrollTop
      const fromRect = fromEl.getBoundingClientRect()
      const toRect = toEl.getBoundingClientRect()

      const x1 = fromRect.right - containerRect.left + scrollLeft
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + scrollTop
      const x2 = toRect.left - containerRect.left + scrollLeft
      const y2 = toRect.top + toRect.height / 2 - containerRect.top + scrollTop

      const midX = (x1 + x2) / 2

      // Bezier path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`)
      path.setAttribute('class', styles.edgePath)
      svg.appendChild(path)

      // Tag pills at midpoint
      const pillY = (y1 + y2) / 2
      const label = edge.through.slice(0, 2).join(', ')
      if (label) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', String(midX))
        text.setAttribute('y', String(pillY))
        text.setAttribute('text-anchor', 'middle')
        text.setAttribute('dominant-baseline', 'middle')
        text.setAttribute('class', styles.tagPill)
        text.textContent = label + (edge.through.length > 2 ? ` +${edge.through.length - 2}` : '')

        // Background rect (approximate)
        const textLen = label.length * 5.5 + (edge.through.length > 2 ? 20 : 0) + 8
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        bg.setAttribute('x', String(midX - textLen / 2))
        bg.setAttribute('y', String(pillY - 8))
        bg.setAttribute('width', String(textLen))
        bg.setAttribute('height', '16')
        bg.setAttribute('class', styles.tagPillBg)

        svg.appendChild(bg)
        svg.appendChild(text)
      }
    }
  }, [lineage])

  if (!lineage) {
    return <div className={styles.emptyMessage}>Select a game to view its lineage</div>
  }

  if (lineage.columns.length === 1 && lineage.edges.length === 0) {
    const game = lineage.columns[0].games[0]
    return (
      <div className={styles.container}>
        <div className={styles.emptyMessage}>
          <LineageCard
            game={game}
            isSelected={true}
            onClick={handleCardClick}
          />
          <p style={{ marginTop: 16 }}>No known influences or descendants</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <svg ref={svgRef} className={styles.svgOverlay} />
      <div className={styles.columns}>
        {lineage.columns.map(col => (
          <div key={col.depth} className={styles.column}>
            <div className={styles.depthLabel}>
              {col.depth < 0 ? `Ancestor ${Math.abs(col.depth)}` : col.depth === 0 ? 'Selected' : `Descendant ${col.depth}`}
            </div>
            {col.games.map(game => (
              <div
                key={game.id}
                ref={el => {
                  if (el) cardRefs.current.set(game.id, el)
                  else cardRefs.current.delete(game.id)
                }}
              >
                <LineageCard
                  game={game}
                  isSelected={game.id === lineage.selectedId}
                  onClick={handleCardClick}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
