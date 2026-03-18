import { describe, it, expect } from 'vitest'
import { searchGame, fetchGameByQid } from './wikidata.js'

describe('wikidata client (integration)', () => {
  it('finds Dark Souls by title', async () => {
    const results = await searchGame('Dark Souls')
    expect(results.length).toBeGreaterThan(0)
    const ds = results.find(r => r.qid === 'Q1166232')
    expect(ds).toBeDefined()
    expect(ds!.title).toBe('Dark Souls')
    expect(ds!.date).toBe('2011-09-22')
    expect(ds!.genres.length).toBeGreaterThan(0)
  }, 15000)

  it('fetches entity by QID', async () => {
    const result = await fetchGameByQid('Q1166232')
    expect(result).not.toBeNull()
    expect(result!.title).toBe('Dark Souls')
    expect(result!.date).toBe('2011-09-22')
  }, 15000)

  it('returns empty for nonsense title', async () => {
    const results = await searchGame('xyzzy12345nonexistent')
    expect(results).toEqual([])
  }, 30000)
})
