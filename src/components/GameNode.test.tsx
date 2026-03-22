// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GameNode } from './GameNode'
import type { GameNode as GameNodeType } from '../types'
import { testGames } from '../test/helpers'

const node: GameNodeType = {
  ...testGames[0],
  x: 100,
  y: 200,
  radius: 6,
}

function renderNode(
  overrides: Partial<{
    onSelect: (id: string | null) => void
    nodeOverride: GameNodeType
    isSelected: boolean
  }> = {},
) {
  const onSelect = overrides.onSelect ?? vi.fn()
  const n = overrides.nodeOverride ?? node
  const isSelected = overrides.isSelected ?? false
  return {
    onSelect,
    ...render(
      <svg>
        <GameNode node={n} color="#ef4444" isSelected={isSelected} onSelect={onSelect} />
      </svg>,
    ),
  }
}

describe('GameNode', () => {
  it('renders with accessible role and label', () => {
    renderNode()
    const btn = screen.getByRole('button', { name: /Pong \(1972\)/ })
    expect(btn).toBeDefined()
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })

  it('calls onSelect with game id on click', () => {
    const onSelect = vi.fn()
    renderNode({ onSelect })
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith('pong')
  })

  it('calls onSelect on Enter key', () => {
    const onSelect = vi.fn()
    renderNode({ onSelect })
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('pong')
  })

  it('calls onSelect on Space key', () => {
    const onSelect = vi.fn()
    renderNode({ onSelect })
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' })
    expect(onSelect).toHaveBeenCalledWith('pong')
  })

  it('displays the game title', () => {
    renderNode()
    expect(screen.getByText('Pong')).toBeDefined()
  })
})
