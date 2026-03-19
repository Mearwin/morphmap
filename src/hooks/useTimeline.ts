import { useEffect, useRef, useState, useMemo } from 'react'
import { scaleTime } from 'd3-scale'
import type { Entity, GameNode } from '../types'
import { useDataset } from '../dataset/DatasetContext'
import { FORCE, TIMELINE, NODE } from '../constants'

export function useTimeline(games: Entity[], width: number, height: number) {
  const { tagPositions } = useDataset()
  const [nodes, setNodes] = useState<GameNode[]>([])
  const workerRef = useRef<Worker | null>(null)

  const xScale = useMemo(() => {
    const dates = games.map(g => new Date(g.date))
    const pad = TIMELINE.DATE_PAD_DAYS * 24 * 60 * 60 * 1000
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())) - pad)
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())) + pad)
    const virtualWidth = width * TIMELINE.WIDTH_MULTIPLIER
    return scaleTime<number>().domain([minDate, maxDate]).range([TIMELINE.SCALE_PADDING, virtualWidth - TIMELINE.SCALE_PADDING])
  }, [games, width])

  // Compute deterministic Y positions using tag-derived positions
  const gameNodeMap = useMemo(() => {
    if (games.length === 0 || width === 0 || height === 0) return null

    const padding = TIMELINE.TAG_Y_PADDING
    const usableHeight = height - padding * 2

    const map = new Map<string, GameNode>()
    for (const g of games) {
      const tagPos = tagPositions.get(g.id) ?? 0.5
      const y = padding + tagPos * usableHeight

      map.set(g.id, {
        ...g,
        x: xScale(new Date(g.date)),
        y,
        radius: NODE.RADIUS,
      })
    }

    return map
  }, [games, width, height, xScale, tagPositions])

  useEffect(() => {
    if (!gameNodeMap) return

    // Create worker
    const worker = new Worker(
      new URL('../workers/forceWorker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    // Prepare serializable node data for the worker
    const workerNodes = Array.from(gameNodeMap.values()).map(n => ({
      id: n.id,
      x: n.x,
      y: n.y,
      radius: n.radius,
      targetX: n.x,
      targetY: n.y,
      title: n.title,
    }))

    worker.onmessage = (e) => {
      const data = e.data as { type: string; positions?: { id: string; x: number; y: number }[]; message?: string }

      if (data.type === 'error') {
        console.error('Force worker error:', data.message)
        setNodes(Array.from(gameNodeMap.values()))
        return
      }

      const { positions } = data as { positions: { id: string; x: number; y: number }[] }
      setNodes(prev => {
        // Reuse existing GameNode objects, only updating x/y
        const updated: GameNode[] = new Array(positions.length)
        for (let i = 0; i < positions.length; i++) {
          const pos = positions[i]
          const base = gameNodeMap.get(pos.id)!
          // Check if position actually changed to avoid unnecessary object creation
          if (prev.length === positions.length && prev[i]?.id === pos.id && prev[i].x === pos.x && prev[i].y === pos.y) {
            updated[i] = prev[i]
          } else {
            updated[i] = { ...base, x: pos.x, y: pos.y }
          }
        }
        return updated
      })
    }

    worker.onerror = () => {
      // If the worker crashes at the top level, fall back to pre-simulation positions
      setNodes(Array.from(gameNodeMap.values()))
    }

    worker.postMessage({
      type: 'init',
      nodes: workerNodes,
      config: {
        xStrength: FORCE.X_STRENGTH,
        yStrength: FORCE.Y_STRENGTH,
        collidePadding: FORCE.COLLIDE_PADDING,
        collideStrength: FORCE.COLLIDE_STRENGTH,
        chargeStrength: FORCE.CHARGE_STRENGTH,
        chargeDistanceMax: FORCE.CHARGE_DISTANCE_MAX,
        alphaDecay: FORCE.ALPHA_DECAY,
      },
    })

    return () => {
      worker.postMessage({ type: 'stop' })
      worker.terminate()
      workerRef.current = null
    }
  }, [gameNodeMap])

  return { nodes, xScale }
}
