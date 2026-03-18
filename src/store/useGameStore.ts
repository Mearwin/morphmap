import { useContext } from 'react'
import { GameStoreContext } from './storeContext'

export function useGameStore() {
  const ctx = useContext(GameStoreContext)
  if (!ctx) throw new Error('useGameStore must be used within GameStoreProvider')
  return ctx
}
