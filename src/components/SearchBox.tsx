import { useState, useMemo, forwardRef, useCallback } from 'react'
import { useGameStore } from '../store/useGameStore'
import { fuzzyFilter } from '../utils/fuzzy'
import styles from './SearchBox.module.css'

export const SearchBox = forwardRef<HTMLInputElement>(function SearchBox(_props, ref) {
  const { games, dispatch } = useGameStore()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)

  const results = useMemo(() => {
    if (query.length < 1) return []
    return fuzzyFilter(games, query, g => g.title, 8)
  }, [games, query])

  const selectResult = useCallback((id: string) => {
    dispatch({ type: 'SELECT_GAME', id })
    setQuery('')
    setActiveIndex(-1)
  }, [dispatch])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i <= 0 ? results.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < results.length) {
      e.preventDefault()
      selectResult(results[activeIndex].item.id)
    }
  }, [results, activeIndex, selectResult])

  return (
    <div className={styles.container} role="search">
      <input
        ref={ref}
        className={styles.input}
        type="text"
        placeholder="Search games... ( / )"
        aria-label="Search games"
        aria-expanded={query.length >= 1}
        aria-controls={query.length >= 1 ? 'search-results' : undefined}
        aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
        role="combobox"
        aria-autocomplete="list"
        value={query}
        onChange={e => { setQuery(e.target.value); setActiveIndex(-1) }}
        onKeyDown={handleKeyDown}
      />
      {query.length >= 1 && (
        <div className={styles.dropdown} id="search-results" role="listbox" aria-label="Search results">
          {results.length > 0 ? results.map(({ item: game, indices }, i) => (
            <button
              key={game.id}
              id={`search-result-${i}`}
              className={`${styles.result}${i === activeIndex ? ` ${styles.active}` : ''}`}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => selectResult(game.id)}
            >
              <span className={styles.title}>
                <HighlightedText text={game.title} indices={indices} />
              </span>
              <span className={styles.year}>{game.date.slice(0, 4)}</span>
            </button>
          )) : (
            <div className={styles.noResults}>No results</div>
          )}
        </div>
      )}
    </div>
  )
})

function HighlightedText({ text, indices }: { text: string; indices: number[] }) {
  if (indices.length === 0) return <>{text}</>

  const matchSet = new Set(indices)
  const parts: { text: string; matched: boolean }[] = []
  let current = ''
  let currentMatched = matchSet.has(0)

  for (let i = 0; i < text.length; i++) {
    const isMatch = matchSet.has(i)
    if (isMatch !== currentMatched) {
      if (current) parts.push({ text: current, matched: currentMatched })
      current = ''
      currentMatched = isMatch
    }
    current += text[i]
  }
  if (current) parts.push({ text: current, matched: currentMatched })

  return (
    <>
      {parts.map((part, i) =>
        part.matched
          ? <span key={i} className={styles.highlight}>{part.text}</span>
          : <span key={i}>{part.text}</span>
      )}
    </>
  )
}
