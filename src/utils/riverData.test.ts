import { describe, it, expect } from 'vitest'
import { buildRiverData } from './riverData'
import type { Game, Link } from '../types'

const games: Game[] = [
  { id: 'doom', title: 'Doom', date: '1993-12-10', tags: ['fps'], primaryTag: 'fps', influencedBy: [] },
  { id: 'quake', title: 'Quake', date: '1996-06-22', tags: ['fps'], primaryTag: 'fps', influencedBy: [{ id: 'doom', through: ['fps', 'modding'] }] },
  { id: 'half-life', title: 'Half-Life', date: '1998-11-19', tags: ['fps'], primaryTag: 'fps', influencedBy: [{ id: 'quake', through: ['fps'] }, { id: 'doom', through: ['fps'] }] },
  { id: 'mario', title: 'Super Mario Bros.', date: '1985-09-13', tags: ['platformer'], primaryTag: 'platformer', influencedBy: [] },
  { id: 'zelda-oot', title: 'Zelda: Ocarina of Time', date: '1998-11-21', tags: ['action-rpg'], primaryTag: 'action-adventure', influencedBy: [{ id: 'mario', through: ['exploration'] }] },
]

const links: Link[] = [
  { source: 'doom', target: 'quake', through: ['fps', 'modding'] },
  { source: 'quake', target: 'half-life', through: ['fps'] },
  { source: 'doom', target: 'half-life', through: ['fps'] },
  { source: 'mario', target: 'zelda-oot', through: ['exploration'] },
]

describe('buildRiverData', () => {
  it('returns slices covering the full time range', () => {
    const { slices } = buildRiverData(games, links, null)
    expect(slices.length).toBeGreaterThan(0)
    expect(slices[0].eraStart).toBe(1970)
    expect(slices[slices.length - 1].eraEnd).toBe(2025)
  })

  it('counts influences in the correct era and category', () => {
    const { slices } = buildRiverData(games, links, null)
    // Quake (1996, 1 incoming) and Half-Life (1998, 2 incoming) are both
    // in the 1995-1999 era, fps category. Total = 3 influence connections.
    const era95 = slices.find(s => s.eraStart === 1995)!
    expect(era95.byCategory['fps'].count).toBe(3)

    // Zelda OoT (1998) in action-adventure, received 1 influence
    expect(era95.byCategory['action-adventure'].count).toBe(1)

    // Mario (1985) in platformer, no incoming influences
    const era85 = slices.find(s => s.eraStart === 1985)!
    expect(era85.byCategory['platformer'].count).toBe(0)
  })

  it('populates game lists sorted by incoming count', () => {
    const { slices } = buildRiverData(games, links, null)
    const era95 = slices.find(s => s.eraStart === 1995)!
    const fpsGames = era95.byCategory['fps'].games
    // Half-Life has 2 incoming, Quake has 1
    expect(fpsGames[0].id).toBe('half-life')
    expect(fpsGames[0].incomingCount).toBe(2)
    expect(fpsGames[1].id).toBe('quake')
    expect(fpsGames[1].incomingCount).toBe(1)
  })

  it('filters by selectedTag', () => {
    const { slices } = buildRiverData(games, links, 'modding')
    const era95 = slices.find(s => s.eraStart === 1995)!
    // Only doom->quake has 'modding' in through
    expect(era95.byCategory['fps'].count).toBe(1)
  })

  it('returns all 10 category ids', () => {
    const { categoryIds } = buildRiverData(games, links, null)
    expect(categoryIds).toHaveLength(10)
    expect(categoryIds).toContain('fps')
    expect(categoryIds).toContain('rpg')
  })

  it('handles empty inputs', () => {
    const { slices } = buildRiverData([], [], null)
    expect(slices.length).toBeGreaterThan(0)
    for (const slice of slices) {
      for (const catId of Object.keys(slice.byCategory)) {
        expect(slice.byCategory[catId].count).toBe(0)
      }
    }
  })
})
