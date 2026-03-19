import { useEffect, useMemo } from 'react'
import type { GameStoreAction } from '../store/gameStoreReducer'
import type { Link, Entity } from '../types'

type EntityMap = Map<string, Entity>

type Params = {
  selectedGameId: string | null
  games: Entity[]
  links: Link[]
  dispatch: React.Dispatch<GameStoreAction>
  searchInputRef: React.RefObject<HTMLInputElement | null>
}

export function getDirectNeighbors(gameId: string, links: Link[]): { ancestors: string[]; descendants: string[] } {
  const ancestors: string[] = []
  const descendants: string[] = []
  for (const link of links) {
    if (link.target === gameId) ancestors.push(link.source)
    if (link.source === gameId) descendants.push(link.target)
  }
  return { ancestors, descendants }
}

export function sortByDate(ids: string[], games: Entity[] | EntityMap): string[] {
  const gameMap = games instanceof Map ? games : new Map(games.map(g => [g.id, g]))
  return ids.slice().sort((a, b) => {
    const ga = gameMap.get(a)
    const gb = gameMap.get(b)
    if (!ga || !gb) return 0
    return new Date(ga.date).getTime() - new Date(gb.date).getTime()
  })
}

/** Pick the neighbor whose date is closest to the selected game's date. */
export function closestByDate(selectedId: string, neighborIds: string[], games: Entity[] | EntityMap): string | null {
  if (neighborIds.length === 0) return null
  const gameMap = games instanceof Map ? games : new Map(games.map(g => [g.id, g]))
  const selectedDate = new Date(gameMap.get(selectedId)?.date ?? '').getTime()
  if (isNaN(selectedDate)) return neighborIds[0]

  let bestId = neighborIds[0]
  let bestDist = Infinity
  for (const id of neighborIds) {
    const g = gameMap.get(id)
    if (!g) continue
    const dist = Math.abs(new Date(g.date).getTime() - selectedDate)
    if (dist < bestDist) {
      bestDist = dist
      bestId = id
    }
  }
  return bestId
}

export function useKeyboardNav({ selectedGameId, games, links, dispatch, searchInputRef }: Params) {
  const gameMap = useMemo(() => new Map(games.map(g => [g.id, g])), [games])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA'

      if (e.key === 'Escape') {
        if (isInput) {
          (e.target as HTMLElement).blur()
          return
        }
        if (selectedGameId) {
          e.preventDefault()
          dispatch({ type: 'SELECT_GAME', id: null })
        }
        return
      }

      if (e.key === '/' && !isInput) {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (!selectedGameId || isInput) return

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const { ancestors, descendants } = getDirectNeighbors(selectedGameId, links)
        const pool = e.key === 'ArrowLeft' ? ancestors : descendants
        if (pool.length === 0) return
        const closest = closestByDate(selectedGameId, pool, gameMap)
        if (closest) dispatch({ type: 'SELECT_GAME', id: closest })
        return
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const { ancestors, descendants } = getDirectNeighbors(selectedGameId, links)
        const all = [...new Set([...ancestors, ...descendants])]
        if (all.length === 0) return
        const sorted = sortByDate(all, gameMap)
        const currentIdx = sorted.indexOf(selectedGameId)
        let nextIdx: number
        if (currentIdx === -1) {
          nextIdx = e.key === 'ArrowDown' ? 0 : sorted.length - 1
        } else {
          nextIdx = e.key === 'ArrowDown'
            ? (currentIdx + 1) % sorted.length
            : (currentIdx - 1 + sorted.length) % sorted.length
        }
        dispatch({ type: 'SELECT_GAME', id: sorted[nextIdx] })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedGameId, gameMap, links, dispatch, searchInputRef])
}
