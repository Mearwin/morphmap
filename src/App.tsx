import { useRef, useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react'
import { ViewToggle } from './components/ViewToggle'
import gamesData from './data/games.json'
import type { Game } from './types'
import { GameStoreProvider } from './store/GameStoreContext'
import { useGameStore } from './store/useGameStore'
import { DatasetProvider } from './dataset/DatasetContext'
import { useDataset } from './dataset/DatasetContext'
import { createGamesDatasetConfig } from './dataset/games'
import { Timeline } from './components/Timeline'
import { TagFilter } from './components/TagFilter'
import { SearchBox } from './components/SearchBox'
import { Legend } from './components/Legend'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TimeRangeSlider } from './components/TimeRangeSlider'
import { useKeyboardNav } from './hooks/useKeyboardNav'
import { ShortcutOverlay } from './components/ShortcutOverlay'
import type { GameNode } from './types'
import './App.css'

const LazyGameDetail = lazy(() =>
  import('./components/GameDetail').then(m => ({ default: m.GameDetail }))
)
const LazyTooltip = lazy(() =>
  import('./components/Tooltip').then(m => ({ default: m.Tooltip }))
)
const LazyLineageView = lazy(() =>
  import('./components/LineageView').then(m => ({ default: m.LineageView }))
)
const LazyEmbedView = lazy(() =>
  import('./components/EmbedView').then(m => ({ default: m.EmbedView }))
)
const games: Game[] = gamesData as Game[]

function AppInner() {
  const { state, games, derived, dispatch } = useGameStore()
  const dataset = useDataset()
  const searchInputRef = useRef<HTMLInputElement>(null)

  useKeyboardNav({
    selectedGameId: state.selectedGameId,
    games,
    links: derived.links,
    dispatch,
    searchInputRef,
  })

  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '?') {
        e.preventDefault()
        setShowShortcuts(v => !v)
      }
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault()
        dispatch({ type: 'SET_VIEW_MODE', mode: state.viewMode === 'river' ? 'timeline' : 'river' })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, state.viewMode])

  const [hovered, setHovered] = useState<{ node: GameNode; x: number; y: number } | null>(null)

  const handleHover = useCallback((node: GameNode | null, pos: { clientX: number; clientY: number }) => {
    if (node) {
      setHovered({ node, x: pos.clientX, y: pos.clientY })
    } else {
      setHovered(null)
    }
  }, [])

  const selectedGame = state.selectedGameId
    ? games.find(g => g.id === state.selectedGameId) ?? null
    : null

  return (
    <div id="app">
      <header className="top-bar">
        <div className="top-bar-left">
          <h1 className="logo">Morphmap</h1>
          <SearchBox ref={searchInputRef} />
          <ViewToggle />
        </div>
        <TagFilter />
        <TimeRangeSlider />
      </header>

      <div className="main-area">
        {state.viewMode === 'lineage' ? (
          <ErrorBoundary fallback={<div style={{ flex: 1 }} />}>
            <Suspense fallback={null}>
              <LazyLineageView />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <>
            <ErrorBoundary fallback={<div style={{ flex: 1 }} />}>
              <Timeline onHover={handleHover} />
            </ErrorBoundary>

            {state.viewMode !== 'river' && (
              <ErrorBoundary fallback={null}>
                <Suspense fallback={null}>
                  <LazyGameDetail game={selectedGame ?? null} />
                </Suspense>
              </ErrorBoundary>
            )}
          </>
        )}
      </div>

      <Legend />
      <div className="stats">{games.length} {dataset.entityLabelPlural}, {derived.links.length} connections</div>

      {hovered && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <LazyTooltip node={hovered.node} x={hovered.x} y={hovered.y} />
          </Suspense>
        </ErrorBoundary>
      )}

      {showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      >
        {selectedGame ? `Selected: ${selectedGame.title}, ${selectedGame.date.slice(0, 4)}` : ''}
      </div>
    </div>
  )
}

function EmbedOrApp() {
  const { state } = useGameStore()

  if (state.embed) {
    return (
      <ErrorBoundary>
        <Suspense fallback={null}>
          <LazyEmbedView />
        </Suspense>
      </ErrorBoundary>
    )
  }

  return <AppInner />
}

function App() {
  const datasetConfig = useMemo(() => createGamesDatasetConfig(games), [])

  return (
    <ErrorBoundary>
      <DatasetProvider config={datasetConfig}>
        <GameStoreProvider games={games}>
          <EmbedOrApp />
        </GameStoreProvider>
      </DatasetProvider>
    </ErrorBoundary>
  )
}

export default App
