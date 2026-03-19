export type TimeRange = { from: number; to: number }

export type GameStoreState = {
  selectedGameId: string | null
  selectedTag: string | null
  timeRange: TimeRange | null
  viewMode: 'timeline' | 'river' | 'lineage'
  embed: boolean
  depth: number | null
}

export type GameStoreAction =
  | { type: 'SELECT_GAME'; id: string | null }
  | { type: 'SELECT_TAG'; tag: string | null }
  | { type: 'SET_TIME_RANGE'; range: TimeRange | null }
  | { type: 'SET_VIEW_MODE'; mode: 'timeline' | 'river' | 'lineage' }

export function gameStoreReducer(state: GameStoreState, action: GameStoreAction): GameStoreState {
  switch (action.type) {
    case 'SELECT_GAME': {
      const newId = action.id === state.selectedGameId ? null : action.id
      return {
        ...state,
        selectedGameId: newId,
        viewMode: newId === null && state.viewMode === 'lineage' ? 'timeline' : state.viewMode,
      }
    }
    case 'SELECT_TAG':
      return {
        ...state,
        selectedTag: action.tag === state.selectedTag ? null : action.tag,
      }
    case 'SET_TIME_RANGE':
      return {
        ...state,
        timeRange: action.range,
      }
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.mode,
      }
  }
}
