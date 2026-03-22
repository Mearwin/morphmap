import { useRef, useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react'
import { ViewToggle } from './components/ViewToggle'
import gamesData from './data/games.json'
import tagIndexData from './data/tag-index.json'
import type { Game } from './types'
import { GameStoreProvider } from './store/GameStoreContext'
import { useGameStore } from './store/useGameStore'
import { DatasetProvider } from './dataset/DatasetContext'
import { useDataset } from './dataset/DatasetContext'
import { createGamesDatasetConfig } from './dataset/games'
import type { PrecomputedTagIndex } from './dataset/games'
import { Timeline } from './components/Timeline'
import { TagFilter } from './components/TagFilter'
import { SearchBox } from './components/SearchBox'
import { Legend } from './components/Legend'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TimeRangeSlider } from './components/TimeRangeSlider'
import { useKeyboardNav } from './hooks/useKeyboardNav'
import { useTheme } from './hooks/useTheme'
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
const LazyMetricsDashboard = lazy(() =>
  import('./components/MetricsDashboard').then(m => ({ default: m.MetricsDashboard }))
)
const LazyTagTrendsView = lazy(() =>
  import('./components/TagTrendsView').then(m => ({ default: m.TagTrendsView }))
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
  const [showMetrics, setShowMetrics] = useState(false)
  const { theme, toggle: toggleTheme } = useTheme()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '?') {
        e.preventDefault()
        setShowShortcuts(v => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
        <div className="top-bar-group">
          <h1 className="logo">Morphmap</h1>
          <SearchBox ref={searchInputRef} />
        </div>
        <div className="top-bar-divider" />
        <div className="top-bar-group top-bar-center">
          <ViewToggle />
          <TimeRangeSlider />
          <button
            className={`metrics-toggle${showMetrics ? ' active' : ''}`}
            onClick={() => setShowMetrics(v => !v)}
            aria-label="Toggle metrics dashboard"
            title="Metrics"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="8" width="3" height="7" rx="0.5" fill="currentColor" />
              <rect x="6" y="4" width="3" height="11" rx="0.5" fill="currentColor" />
              <rect x="11" y="1" width="3" height="14" rx="0.5" fill="currentColor" />
            </svg>
          </button>
        </div>
        <div className="top-bar-divider" />
        <div className="top-bar-group">
          <TagFilter />
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 9.5a5.5 5.5 0 01-7-7 5.5 5.5 0 107 7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className="main-area">
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <LazyMetricsDashboard open={showMetrics} onClose={() => setShowMetrics(false)} />
          </Suspense>
        </ErrorBoundary>

        {state.viewMode === 'lineage' ? (
          <ErrorBoundary fallback={<div style={{ flex: 1 }} />}>
            <Suspense fallback={null}>
              <LazyLineageView maxDepth={2} />
            </Suspense>
          </ErrorBoundary>
        ) : state.viewMode === 'trends' ? (
          <ErrorBoundary fallback={<div style={{ flex: 1 }} />}>
            <Suspense fallback={null}>
              <LazyTagTrendsView />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <>
            <ErrorBoundary fallback={<div style={{ flex: 1 }} />}>
              <Timeline onHover={handleHover} />
            </ErrorBoundary>

            <ErrorBoundary fallback={null}>
              <Suspense fallback={null}>
                <LazyGameDetail game={selectedGame ?? null} />
              </Suspense>
            </ErrorBoundary>
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
  const datasetConfig = useMemo(
    () => createGamesDatasetConfig(games, tagIndexData as PrecomputedTagIndex),
    [],
  )

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
