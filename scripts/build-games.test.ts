import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildGames } from './build-games.js'

describe('buildGames', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'morphmap-test-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('concatenates individual files into sorted array', () => {
    writeFileSync(join(dir, 'dark-souls.json'), JSON.stringify({
      id: 'dark-souls',
      title: 'Dark Souls',
      date: '2011-09-22',
      tags: ['stamina-combat'],
      primaryTag: 'rpg',
      influencedBy: [],
    }))
    writeFileSync(join(dir, 'pong.json'), JSON.stringify({
      id: 'pong',
      title: 'Pong',
      date: '1972-11-29',
      tags: ['arcade'],
      primaryTag: 'puzzle',
      influencedBy: [],
    }))

    const result = buildGames(dir)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('pong') // sorted by date
    expect(result[1].id).toBe('dark-souls')
  })

  it('throws on invalid JSON file', () => {
    writeFileSync(join(dir, 'bad.json'), '{ not valid json }')
    expect(() => buildGames(dir)).toThrow('bad.json')
  })

  it('throws on missing required field', () => {
    writeFileSync(join(dir, 'no-title.json'), JSON.stringify({
      id: 'no-title',
      date: '2020-01-01',
      tags: ['test'],
      primaryTag: 'rpg',
      influencedBy: [],
    }))
    expect(() => buildGames(dir)).toThrow('title')
  })

  it('throws on invalid primaryTag', () => {
    writeFileSync(join(dir, 'bad-tag.json'), JSON.stringify({
      id: 'bad-tag',
      title: 'Bad Tag',
      date: '2020-01-01',
      tags: ['test'],
      primaryTag: 'not-a-category',
      influencedBy: [],
    }))
    expect(() => buildGames(dir)).toThrow('primaryTag')
  })

  it('throws on invalid date format', () => {
    writeFileSync(join(dir, 'bad-date.json'), JSON.stringify({
      id: 'bad-date',
      title: 'Bad Date',
      date: '2020/01/01',
      tags: ['test'],
      primaryTag: 'rpg',
      influencedBy: [],
    }))
    expect(() => buildGames(dir)).toThrow('date')
  })

  it('returns empty array for empty directory', () => {
    expect(buildGames(dir)).toEqual([])
  })
})
