// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { TagFilter } from './TagFilter'
import { renderWithStore } from '../test/helpers'

describe('TagFilter', () => {
  it('renders tag buttons', () => {
    renderWithStore(<TagFilter />)
    // 'arcade' appears on all 3 test games so it should be in the top tags
    expect(screen.getByRole('button', { name: /arcade/i })).toBeDefined()
  })

  it('shows tag counts', () => {
    renderWithStore(<TagFilter />)
    // 'arcade' appears on all 3 test games
    const arcadeBtn = screen.getByRole('button', { name: /arcade/i })
    expect(arcadeBtn.textContent).toContain('3')
  })

  it('has group role with label', () => {
    renderWithStore(<TagFilter />)
    expect(screen.getByRole('group', { name: /filter by game tag/i })).toBeDefined()
  })

  it('toggles aria-pressed on click', () => {
    renderWithStore(<TagFilter />)
    const btn = screen.getByRole('button', { name: /arcade/i })
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-pressed')).toBe('false')
  })
})
