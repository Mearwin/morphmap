import { describe, it, expect } from 'vitest'
import games from './games.json'

const gameIds = new Set(games.map(g => g.id))
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

describe('games.json validation', () => {
  it('has no duplicate IDs', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const g of games) {
      if (seen.has(g.id)) dupes.push(g.id)
      seen.add(g.id)
    }
    expect(dupes, `Duplicate IDs: ${dupes.join(', ')}`).toEqual([])
  })

  it('every game has required fields with correct types', () => {
    const errors: string[] = []
    for (const g of games) {
      if (typeof g.id !== 'string' || g.id === '') errors.push(`${g.id ?? '?'}: missing id`)
      if (typeof g.title !== 'string' || g.title === '') errors.push(`${g.id}: missing title`)
      if (typeof g.date !== 'string') errors.push(`${g.id}: missing date`)
      if (!Array.isArray(g.tags)) errors.push(`${g.id}: tags is not an array`)
      if (!Array.isArray(g.influencedBy)) errors.push(`${g.id}: influencedBy is not an array`)
    }
    expect(errors, errors.join('\n')).toEqual([])
  })

  it('every date is valid YYYY-MM-DD and parses to a real date', () => {
    const errors: string[] = []
    for (const g of games) {
      if (!DATE_RE.test(g.date)) {
        errors.push(`${g.id}: invalid date format "${g.date}"`)
        continue
      }
      const d = new Date(g.date)
      if (isNaN(d.getTime())) {
        errors.push(`${g.id}: date "${g.date}" does not parse`)
      }
    }
    expect(errors, errors.join('\n')).toEqual([])
  })

  it('every influencedBy reference points to an existing game', () => {
    const errors: string[] = []
    for (const g of games) {
      for (const inf of g.influencedBy) {
        if (!gameIds.has(inf.id)) {
          errors.push(`${g.id}: influencedBy references unknown game "${inf.id}"`)
        }
      }
    }
    expect(errors, errors.join('\n')).toEqual([])
  })

  it('no game references itself in influencedBy', () => {
    const errors: string[] = []
    for (const g of games) {
      for (const inf of g.influencedBy) {
        if (inf.id === g.id) {
          errors.push(`${g.id}: references itself in influencedBy`)
        }
      }
    }
    expect(errors, errors.join('\n')).toEqual([])
  })

  it('every influence has a non-empty through array', () => {
    const errors: string[] = []
    for (const g of games) {
      for (const inf of g.influencedBy) {
        if (!Array.isArray(inf.through) || inf.through.length === 0) {
          errors.push(`${g.id}: influence from "${inf.id}" has empty through`)
        }
      }
    }
    expect(errors, errors.join('\n')).toEqual([])
  })

  it('every game has at least one tag', () => {
    const errors: string[] = []
    for (const g of games) {
      if (g.tags.length === 0) {
        errors.push(`${g.id}: has no tags`)
      }
    }
    expect(errors, errors.join('\n')).toEqual([])
  })

  it('every imageUrl is a valid IGDB CDN URL or absent', () => {
    const errors: string[] = []
    for (const g of games) {
      if ('imageUrl' in g && (g as Record<string, unknown>).imageUrl != null) {
        const url = (g as Record<string, unknown>).imageUrl as string
        if (typeof url !== 'string' || !url.startsWith('https://images.igdb.com/')) {
          errors.push(`${g.id}: imageUrl is not a valid IGDB CDN URL`)
        }
      }
    }
    expect(errors, errors.join('\n')).toEqual([])
  })

  it('every influence source was released before the influenced game', () => {
    const dateMap = new Map(games.map(g => [g.id, g.date]))
    const errors: string[] = []
    for (const g of games) {
      for (const inf of g.influencedBy) {
        const sourceDate = dateMap.get(inf.id)
        if (sourceDate && sourceDate >= g.date) {
          errors.push(`${g.id} (${g.date}) influenced by "${inf.id}" (${sourceDate}) which was not released before it`)
        }
      }
    }
    expect(errors, errors.join('\n')).toEqual([])
  })

  it('every through tag is present in the target game tags', () => {
    const errors: string[] = []
    for (const g of games) {
      const tagSet = new Set(g.tags)
      for (const inf of g.influencedBy) {
        for (const t of inf.through) {
          if (!tagSet.has(t)) {
            errors.push(`${g.id}: through tag "${t}" (from ${inf.id}) not in own tags`)
          }
        }
      }
    }
    expect(errors, errors.join('\n')).toEqual([])
  })

  it('no influence cycles of length 1 (A influenced by B and B influenced by A)', () => {
    const errors: string[] = []
    const influenceMap = new Map<string, Set<string>>()
    for (const g of games) {
      influenceMap.set(g.id, new Set(g.influencedBy.map(i => i.id)))
    }
    for (const g of games) {
      for (const inf of g.influencedBy) {
        const reverseInfluences = influenceMap.get(inf.id)
        if (reverseInfluences?.has(g.id)) {
          // Only report once (alphabetical order)
          if (g.id < inf.id) {
            errors.push(`Mutual influence: "${g.id}" <-> "${inf.id}"`)
          }
        }
      }
    }
    expect(errors, errors.join('\n')).toEqual([])
  })
})
