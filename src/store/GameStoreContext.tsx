import { useReducer, useMemo, type ReactNode } from 'react'
import type { Entity } from '../types'
import { buildLinks, buildAdjacency, getAncestors, getDescendants } from '../utils/graph'
import { gameStoreReducer } from './gameStoreReducer'
import { GameStoreContext, type GameStoreDerived } from './storeContext'
import { readInitialStateFromHash, useSyncHashWithState } from '../hooks/useHashState'

export function GameStoreProvider({ games, children }: { games: Entity[]; children: ReactNode }) {
  const [state, dispatch] = useReducer(gameStoreReducer, undefined, () => {
    const hashState = readInitialStateFromHash()
    // Validate game ID from URL hash against actual dataset
    if (hashState.selectedGameId && !games.some(g => g.id === hashState.selectedGameId)) {
      delete hashState.selectedGameId
    }
    return {
      selectedGameId: null,
      selectedTag: null,
      viewMode: 'timeline' as const,
      embed: false,
      depth: null,
      ...hashState,
    }
  })

  useSyncHashWithState(state)

  const links = useMemo(() => buildLinks(games), [games])
  const adjacency = useMemo(() => buildAdjacency(links), [links])
  const { selectedGameId } = state

  const derived = useMemo<GameStoreDerived>(() => {
    if (!selectedGameId) {
      return { links, adjacency, connectedSet: null, connectedLinks: null }
    }

    const adj = adjacency
    const ancestors = getAncestors(selectedGameId, links, adj, 2)
    const descendants = getDescendants(selectedGameId, links, adj, 2)
    const connectedSet = new Set([selectedGameId, ...ancestors, ...descendants])
    const ancestorsWithSelected = new Set([selectedGameId, ...ancestors])
    const descendantsWithSelected = new Set([selectedGameId, ...descendants])
    const connectedLinks = new Set(
      links
        .filter(l =>
          // Ancestor links: source and target both in ancestor lineage
          (ancestorsWithSelected.has(l.source) && ancestorsWithSelected.has(l.target))
          // Descendant links: source and target both in descendant lineage
          || (descendantsWithSelected.has(l.source) && descendantsWithSelected.has(l.target))
        )
        .map(l => `${l.source}->${l.target}`)
    )
    return { links, adjacency, connectedSet, connectedLinks }
  }, [selectedGameId, links, adjacency])

  const value = useMemo(
    () => ({ state, derived, games, dispatch }),
    [state, derived, games, dispatch]
  )

  return (
    <GameStoreContext.Provider value={value}>
      {children}
    </GameStoreContext.Provider>
  )
}
