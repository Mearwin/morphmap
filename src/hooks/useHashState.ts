import { useEffect, useRef } from 'react'
import type { GameStoreState, TimeRange } from '../store/gameStoreReducer'

export function parseHash(): { game: string | null; tag: string | null; timeRange: TimeRange | null; view: 'lineage' | null; embed: boolean; depth: number | null } {
  const hash = window.location.hash.slice(1)
  if (!hash) return { game: null, tag: null, timeRange: null, view: null, embed: false, depth: null }
  const params = new URLSearchParams(hash)
  let timeRange: TimeRange | null = null
  const from = params.get('from')
  const to = params.get('to')
  if (from && to) {
    const f = parseInt(from, 10)
    const t = parseInt(to, 10)
    if (!isNaN(f) && !isNaN(t)) timeRange = { from: f, to: t }
  }
  const viewParam = params.get('view')
  const view = viewParam === 'lineage' ? viewParam : null
  const embed = params.get('embed') === 'true'
  const depthParam = params.get('depth')
  let depth: number | null = null
  if (depthParam !== null) {
    const d = parseInt(depthParam, 10)
    if (!isNaN(d)) depth = d
  }
  return {
    game: params.get('game'),
    tag: params.get('tag'),
    timeRange,
    view,
    embed,
    depth,
  }
}

export function buildHash(state: GameStoreState): string {
  const params = new URLSearchParams()
  if (state.selectedGameId) params.set('game', state.selectedGameId)
  if (state.selectedTag) params.set('tag', state.selectedTag)
  if (state.timeRange) {
    params.set('from', String(state.timeRange.from))
    params.set('to', String(state.timeRange.to))
  }
  if (state.viewMode !== 'timeline') params.set('view', state.viewMode)
  if (state.embed) params.set('embed', 'true')
  if (state.depth !== null) params.set('depth', String(state.depth))
  const str = params.toString()
  return str ? `#${str}` : ''
}

export function readInitialStateFromHash(): Partial<GameStoreState> {
  const { game, tag, timeRange, view, embed, depth } = parseHash()
  return {
    ...(game ? { selectedGameId: game } : {}),
    ...(tag ? { selectedTag: tag } : {}),
    ...(timeRange ? { timeRange } : {}),
    ...(view ? { viewMode: view } : {}),
    ...(embed ? { embed } : {}),
    ...(depth !== null ? { depth } : {}),
  }
}

export function useSyncHashWithState(state: GameStoreState) {
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip the first render to avoid overwriting the hash we just read
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const hash = buildHash(state)
    if (hash) {
      window.history.replaceState(null, '', hash)
    } else {
      // Clear hash without triggering a scroll
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [state])
}
