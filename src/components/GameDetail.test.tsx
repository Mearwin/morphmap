// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { GameDetail } from './GameDetail'
import { renderWithStore, testGames } from '../test/helpers'

describe('GameDetail', () => {
  it('renders game title and year', () => {
    renderWithStore(<GameDetail game={testGames[0]} />)
    expect(screen.getByText('Pong')).toBeDefined()
    expect(screen.getByText('1972')).toBeDefined()
  })

  it('renders game tags', () => {
    renderWithStore(<GameDetail game={testGames[0]} />)
    expect(screen.getByText('arcade')).toBeDefined()
    expect(screen.getByText('two-player')).toBeDefined()
  })

  it('renders ancestors when present', () => {
    renderWithStore(<GameDetail game={testGames[1]} />)
    expect(screen.getByText('Influenced by')).toBeDefined()
    expect(screen.getByText('Pong (1972)')).toBeDefined()
  })

  it('does not render ancestors section for root game', () => {
    renderWithStore(<GameDetail game={testGames[0]} />)
    expect(screen.queryByText('Influenced by')).toBeNull()
  })

  it('has accessible region role', () => {
    renderWithStore(<GameDetail game={testGames[0]} />)
    expect(screen.getByRole('region', { name: /Details for Pong/ })).toBeDefined()
  })

  it('renders ancestors as clickable buttons', () => {
    renderWithStore(<GameDetail game={testGames[1]} />)
    const ancestorBtn = screen.getByRole('button', { name: /Pong/ })
    expect(ancestorBtn).toBeDefined()
    // Clicking should not throw
    fireEvent.click(ancestorBtn)
  })
})
