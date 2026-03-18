import { useCallback, useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import styles from './TimeRangeSlider.module.css'

const MIN_YEAR = 1972
const MAX_YEAR = 2024

export function TimeRangeSlider() {
  const { state, dispatch } = useGameStore()
  const fromYear = state.timeRange?.from ?? MIN_YEAR
  const toYear = state.timeRange?.to ?? MAX_YEAR

  const isFiltered = state.timeRange !== null

  const handleFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    const newFrom = Math.min(val, toYear)
    if (newFrom === MIN_YEAR && toYear === MAX_YEAR) {
      dispatch({ type: 'SET_TIME_RANGE', range: null })
    } else {
      dispatch({ type: 'SET_TIME_RANGE', range: { from: newFrom, to: toYear } })
    }
  }, [toYear, dispatch])

  const handleToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    const newTo = Math.max(val, fromYear)
    if (fromYear === MIN_YEAR && newTo === MAX_YEAR) {
      dispatch({ type: 'SET_TIME_RANGE', range: null })
    } else {
      dispatch({ type: 'SET_TIME_RANGE', range: { from: fromYear, to: newTo } })
    }
  }, [fromYear, dispatch])

  const handleReset = useCallback(() => {
    dispatch({ type: 'SET_TIME_RANGE', range: null })
  }, [dispatch])

  const leftPct = useMemo(() => ((fromYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100, [fromYear])
  const rightPct = useMemo(() => ((toYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100, [toYear])

  return (
    <div className={styles.container} role="group" aria-label="Time range filter">
      <span className={styles.label} aria-hidden="true">{fromYear}</span>
      <div className={styles.track}>
        <div
          className={styles.range}
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
        <input
          type="range"
          min={MIN_YEAR}
          max={MAX_YEAR}
          value={fromYear}
          onChange={handleFromChange}
          className={styles.thumb}
          aria-label={`Start year: ${fromYear}`}
          aria-valuemin={MIN_YEAR}
          aria-valuemax={MAX_YEAR}
          aria-valuenow={fromYear}
        />
        <input
          type="range"
          min={MIN_YEAR}
          max={MAX_YEAR}
          value={toYear}
          onChange={handleToChange}
          className={styles.thumb}
          aria-label={`End year: ${toYear}`}
          aria-valuemin={MIN_YEAR}
          aria-valuemax={MAX_YEAR}
          aria-valuenow={toYear}
        />
      </div>
      <span className={styles.label} aria-hidden="true">{toYear}</span>
      {isFiltered && (
        <button className={styles.reset} onClick={handleReset} title="Reset time range">
          &times;
        </button>
      )}
    </div>
  )
}
