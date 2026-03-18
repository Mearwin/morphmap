// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { SearchBox } from './SearchBox'
import { renderWithStore } from '../test/helpers'

describe('SearchBox', () => {
  it('renders search input', () => {
    renderWithStore(<SearchBox />)
    expect(screen.getByRole('combobox', { name: /search games/i })).toBeDefined()
  })

  it('shows no results initially', () => {
    renderWithStore(<SearchBox />)
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('shows results when typing a matching query', () => {
    renderWithStore(<SearchBox />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'Pong' } })
    expect(screen.getByRole('listbox')).toBeDefined()
    expect(screen.getByRole('option', { name: /Pong/i })).toBeDefined()
  })

  it('shows "No results" for non-matching query', () => {
    renderWithStore(<SearchBox />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'zzzznotfound' } })
    expect(screen.getByText('No results')).toBeDefined()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('clears query after selecting a result', () => {
    renderWithStore(<SearchBox />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Pong' } })
    const option = screen.getByRole('option', { name: /Pong/i })
    fireEvent.click(option)
    expect(input.value).toBe('')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('highlights results with ArrowDown/ArrowUp', () => {
    renderWithStore(<SearchBox />)
    const input = screen.getByRole('combobox')
    // Use a broad query to get multiple results
    fireEvent.change(input, { target: { value: 'a' } })

    const options = screen.getAllByRole('option')
    // Nothing highlighted initially
    for (const opt of options) {
      expect(opt.getAttribute('aria-selected')).toBe('false')
    }

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(options[0].getAttribute('aria-selected')).toBe('true')
    expect(options[1].getAttribute('aria-selected')).toBe('false')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(options[0].getAttribute('aria-selected')).toBe('false')
    expect(options[1].getAttribute('aria-selected')).toBe('true')

    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(options[0].getAttribute('aria-selected')).toBe('true')
    expect(options[1].getAttribute('aria-selected')).toBe('false')
  })

  it('selects highlighted result with Enter', () => {
    renderWithStore(<SearchBox />)
    const input = screen.getByRole('combobox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Pong' } })

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input.value).toBe('')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('resets active index when query changes', () => {
    renderWithStore(<SearchBox />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'Pong' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true')

    fireEvent.change(input, { target: { value: 'Pon' } })
    const options = screen.getAllByRole('option')
    for (const opt of options) {
      expect(opt.getAttribute('aria-selected')).toBe('false')
    }
  })
})
