import { describe, it, expect } from 'vitest'
import { gameStoreReducer, type GameStoreState } from './gameStoreReducer'

const initial: GameStoreState = {
  selectedGameId: null,
  selectedTag: null,
  viewMode: 'timeline' as const,
  embed: false,
  depth: null,
}

describe('gameStoreReducer', () => {
  it('selects a game', () => {
    const next = gameStoreReducer(initial, { type: 'SELECT_GAME', id: 'doom' })
    expect(next.selectedGameId).toBe('doom')
  })

  it('deselects a game when same id is selected', () => {
    const state = { ...initial, selectedGameId: 'doom' }
    const next = gameStoreReducer(state, { type: 'SELECT_GAME', id: 'doom' })
    expect(next.selectedGameId).toBeNull()
  })

  it('clears selection', () => {
    const state = { ...initial, selectedGameId: 'doom' }
    const next = gameStoreReducer(state, { type: 'SELECT_GAME', id: null })
    expect(next.selectedGameId).toBeNull()
  })

  it('selects a tag', () => {
    const next = gameStoreReducer(initial, { type: 'SELECT_TAG', tag: 'fps' })
    expect(next.selectedTag).toBe('fps')
  })

  it('deselects a tag when same tag is selected', () => {
    const state = { ...initial, selectedTag: 'fps' }
    const next = gameStoreReducer(state, { type: 'SELECT_TAG', tag: 'fps' })
    expect(next.selectedTag).toBeNull()
  })

  it('sets view mode to lineage', () => {
    const next = gameStoreReducer(initial, { type: 'SET_VIEW_MODE', mode: 'lineage' })
    expect(next.viewMode).toBe('lineage')
  })

  it('falls back to timeline when deselecting game in lineage mode', () => {
    const state: GameStoreState = { ...initial, selectedGameId: 'doom', viewMode: 'lineage' }
    const next = gameStoreReducer(state, { type: 'SELECT_GAME', id: null })
    expect(next.selectedGameId).toBeNull()
    expect(next.viewMode).toBe('timeline')
  })

  it('stays in lineage when selecting a different game', () => {
    const state: GameStoreState = { ...initial, selectedGameId: 'doom', viewMode: 'lineage' }
    const next = gameStoreReducer(state, { type: 'SELECT_GAME', id: 'quake' })
    expect(next.selectedGameId).toBe('quake')
    expect(next.viewMode).toBe('lineage')
  })
})
