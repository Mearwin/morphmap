import { useMemo, useState, useRef, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { useDataset } from '../dataset/DatasetContext'
import { getAllTags } from '../utils/graph'
import styles from './TagFilter.module.css'

const VISIBLE_COUNT = 8

export function TagFilter() {
  const { games, state, dispatch } = useGameStore()
  const { entityLabel } = useDataset()
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

  // If the selected tag isn't in the top N, place it first and drop the last visible tag
  const visibleTags = useMemo(() => {
    const top = sortedTags.slice(0, VISIBLE_COUNT)
    if (!state.selectedTag || top.includes(state.selectedTag)) {
      // Selected tag already visible (or none selected) — just move it to front
      if (state.selectedTag) {
        const idx = top.indexOf(state.selectedTag)
        if (idx > 0) {
          const reordered = [...top]
          reordered.splice(idx, 1)
          reordered.unshift(state.selectedTag)
          return reordered
        }
      }
      return top
    }
    // Selected tag is in overflow — put it first, drop last visible
    return [state.selectedTag, ...top.slice(0, VISIBLE_COUNT - 1)]
  }, [sortedTags, state.selectedTag])

  const overflowTags = useMemo(
    () => sortedTags.filter(t => !visibleTags.includes(t)),
    [sortedTags, visibleTags],
  )

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
    const isActive = state.selectedTag === tag
    return (
      <button
        key={tag}
        className={`${styles.chip} ${isActive ? styles.active : ''}`}
        aria-pressed={isActive}
        onClick={() => {
          dispatch({ type: 'SELECT_TAG', tag })
          setExpanded(false)
        }}
      >
        {tag}
        <span className={styles.count}>{tagCounts[tag]}</span>
        {isActive && <span className={styles.dismiss} aria-hidden="true">&times;</span>}
      </button>
    )
  }

  return (
    <div className={styles.container} role="group" aria-label={`Filter by ${entityLabel} tag`} ref={dropdownRef}>
      <div className={styles.inline}>
        {visibleTags.map(renderChip)}
      </div>
      {overflowTags.length > 0 && (
        <button
          className={`${styles.chip} ${styles.moreBtn} ${expanded ? styles.active : ''}`}
          onClick={() => { setExpanded(!expanded); if (expanded) setSearch('') }}
          aria-expanded={expanded}
        >
          +{overflowTags.length} more
        </button>
      )}
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
