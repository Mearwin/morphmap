import { type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { GameStoreProvider } from '../store/GameStoreContext'
import type { Game } from '../types'

export const testGames: Game[] = [
  {
    id: 'pong',
    title: 'Pong',
    date: '1972-11-29',
    tags: ['arcade', 'two-player'],
    primaryTag: 'puzzle',
    influencedBy: [],
  },
  {
    id: 'space-invaders',
    title: 'Space Invaders',
    date: '1978-06-01',
    tags: ['arcade', 'shooter'],
    primaryTag: 'fps',
    influencedBy: [{ id: 'pong', through: ['arcade'] }],
  },
  {
    id: 'asteroids',
    title: 'Asteroids',
    date: '1979-11-01',
    tags: ['arcade', 'shooter', 'momentum'],
    primaryTag: 'fps',
    influencedBy: [{ id: 'space-invaders', through: ['arcade', 'shooter'] }],
  },
]

function Wrapper({ children }: { children: ReactNode }) {
  return <GameStoreProvider games={testGames}>{children}</GameStoreProvider>
}

export function renderWithStore(ui: ReactNode, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: Wrapper, ...options })
}
