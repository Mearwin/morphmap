import { useMemo, useState, useRef, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getAllTags } from '../utils/graph'
import styles from './TagFilter.module.css'

const VISIBLE_COUNT = 8

export function TagFilter() {
  const { games, state, dispatch } = useGameStore()
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const tags = useMemo(() => getAllTags(games), [games])

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const game of games) {
      for (const tag of game.tags) {
        counts[tag] = (counts[tag] || 0) + 1
      }
    }
    return counts
  }, [games])

  const sortedTags = useMemo(
    () => [...tags].sort((a, b) => (tagCounts[b] || 0) - (tagCounts[a] || 0)),
    [tags, tagCounts]
  )

  const visibleTags = sortedTags.slice(0, VISIBLE_COUNT)
  const overflowTags = sortedTags.slice(VISIBLE_COUNT)

  // If the selected tag is in overflow, swap it into visible
  const selectedInOverflow = state.selectedTag && overflowTags.includes(state.selectedTag)

  // Close dropdown on outside click
  useEffect(() => {
    if (!expanded) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExpanded(false)
        setSearch('')
      }
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [expanded])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (expanded) {
      searchRef.current?.focus()
    }
  }, [expanded])

  const filteredOverflow = useMemo(() => {
    if (!search) return overflowTags
    const q = search.toLowerCase()
    return overflowTags.filter(tag => tag.toLowerCase().includes(q))
  }, [overflowTags, search])

  function renderChip(tag: string) {
    return (
      <button
        key={tag}
        className={`${styles.chip} ${state.selectedTag === tag ? styles.active : ''}`}
        aria-pressed={state.selectedTag === tag}
        onClick={() => {
          dispatch({ type: 'SELECT_TAG', tag })
          setExpanded(false)
        }}
      >
        {tag}
        <span className={styles.count}>{tagCounts[tag]}</span>
      </button>
    )
  }

  return (
    <div className={styles.container} role="group" aria-label="Filter by game mechanic" ref={dropdownRef}>
      <div className={styles.inline}>
        {visibleTags.map(renderChip)}
        {selectedInOverflow && renderChip(state.selectedTag!)}
        {overflowTags.length > 0 && (
          <button
            className={`${styles.chip} ${styles.moreBtn} ${expanded ? styles.active : ''}`}
            onClick={() => { setExpanded(!expanded); if (expanded) setSearch('') }}
            aria-expanded={expanded}
          >
            +{overflowTags.length} more
          </button>
        )}
      </div>
      {expanded && (
        <div className={styles.dropdown}>
          <input
            ref={searchRef}
            className={styles.search}
            type="text"
            placeholder="Search tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className={styles.dropdownTags}>
            {filteredOverflow.length > 0
              ? filteredOverflow.map(renderChip)
              : <span className={styles.noResults}>No matching tags</span>
            }
          </div>
        </div>
      )}
    </div>
  )
}
