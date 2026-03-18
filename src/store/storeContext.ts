import { createContext } from 'react'
import type { Game, Link } from '../types'
import type { Adjacency } from '../utils/graph'
import type { GameStoreState, GameStoreAction } from './gameStoreReducer'

export type GameStoreDerived = {
  links: Link[]
  adjacency: Adjacency
  connectedSet: Set<string> | null
  connectedLinks: Set<string> | null
}

export type GameStoreContextValue = {
  state: GameStoreState
  derived: GameStoreDerived
  games: Game[]
  dispatch: React.Dispatch<GameStoreAction>
}

export const GameStoreContext = createContext<GameStoreContextValue | null>(null)
