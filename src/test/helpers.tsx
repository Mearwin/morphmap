import { type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { GameStoreProvider } from '../store/GameStoreContext'
import { DatasetProvider } from '../dataset/DatasetContext'
import { createGamesDatasetConfig } from '../dataset/games'
import type { Game } from '../types'

export const testGames: Game[] = [
  {
    id: 'pong',
    title: 'Pong',
    date: '1972-11-29',
    tags: ['arcade', 'two-player'],
    influencedBy: [],
  },
  {
    id: 'space-invaders',
    title: 'Space Invaders',
    date: '1978-06-01',
    tags: ['arcade', 'shooter'],
    influencedBy: [{ id: 'pong', through: ['arcade'] }],
  },
  {
    id: 'asteroids',
    title: 'Asteroids',
    date: '1979-11-01',
    tags: ['arcade', 'shooter', 'momentum'],
    influencedBy: [{ id: 'space-invaders', through: ['arcade', 'shooter'] }],
  },
]

const testDatasetConfig = createGamesDatasetConfig(testGames)

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <DatasetProvider config={testDatasetConfig}>
      <GameStoreProvider games={testGames}>{children}</GameStoreProvider>
    </DatasetProvider>
  )
}

export function renderWithStore(ui: ReactNode, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: Wrapper, ...options })
}
