import { TAG_CATEGORIES } from '../../src/types.js'

interface GenreResult {
  tags: string[]
  primaryTag: string
}

// Map Wikidata genre labels → our tags
// Key: substring to match (lowercased), Value: tags to add
const GENRE_TAG_MAP: [string, string[]][] = [
  ['first-person shooter', ['fps', 'shooter']],
  ['third-person shooter', ['third-person-shooter', 'shooter']],
  ['shooter', ['shooter']],
  ['action role-playing', ['action-rpg']],
  ['role-playing', ['rpg']],
  ['jrpg', ['jrpg', 'rpg']],
  ['japanese role-playing', ['jrpg', 'rpg']],
  ['tactical role-playing', ['tactical-rpg']],
  ['real-time strategy', ['rts']],
  ['turn-based strategy', ['turn-based-strategy']],
  ['strategy', ['strategy']],
  ['simulation', ['simulation']],
  ['platformer', ['platformer']],
  ['platform game', ['platformer']],
  ['metroidvania', ['metroidvania']],
  ['puzzle', ['puzzle']],
  ['adventure', ['adventure']],
  ['action-adventure', ['action-adventure']],
  ['survival horror', ['survival-horror']],
  ['horror', ['horror']],
  ['survival', ['survival']],
  ['sandbox', ['sandbox']],
  ['open world', ['open-world']],
  ['roguelike', ['roguelike']],
  ['roguelite', ['roguelite']],
  ['fighting game', ['fighting']],
  ['sports', ['sports']],
  ['racing', ['racing']],
  ['stealth', ['stealth']],
  ['battle royale', ['battle-royale']],
  ['soulslike', ['soulslike']],
  ['hack and slash', ['hack-and-slash']],
  ['mmorpg', ['mmorpg']],
  ['massively multiplayer', ['mmo']],
]

// Map our tags → primaryTag category
const TAG_TO_PRIMARY: Record<string, string> = {
  'fps': 'fps',
  'shooter': 'fps',
  'third-person-shooter': 'fps',
  'action-rpg': 'rpg',
  'rpg': 'rpg',
  'jrpg': 'rpg',
  'tactical-rpg': 'rpg',
  'mmorpg': 'rpg',
  'rts': 'strategy',
  'turn-based-strategy': 'strategy',
  'strategy': 'strategy',
  'simulation': 'strategy',
  'platformer': 'platformer',
  'metroidvania': 'platformer',
  'puzzle': 'puzzle',
  'adventure': 'puzzle',
  'action-adventure': 'action-adventure',
  'survival-horror': 'survival-horror',
  'horror': 'survival-horror',
  'survival': 'survival-horror',
  'sandbox': 'sandbox',
  'open-world': 'sandbox',
  'roguelike': 'roguelike',
  'roguelite': 'roguelike',
  'fighting': 'fighting',
  'sports': 'fighting',
  'racing': 'fighting',
  'soulslike': 'rpg',
  'hack-and-slash': 'action-adventure',
  'stealth': 'action-adventure',
  'battle-royale': 'fps',
  'mmo': 'rpg',
}

// Priority order for primaryTag selection (most specific first)
const PRIMARY_PRIORITY: string[] = TAG_CATEGORIES.map(c => c.id)

const DEFAULT_PRIMARY = 'action-adventure'

export function mapGenres(wikidataGenres: string[]): GenreResult {
  const tags = new Set<string>()
  const primaryCandidates = new Set<string>()

  for (const genre of wikidataGenres) {
    const lower = genre.toLowerCase()
    let matched = false

    for (const [pattern, mappedTags] of GENRE_TAG_MAP) {
      if (lower.includes(pattern)) {
        for (const tag of mappedTags) {
          tags.add(tag)
          const primary = TAG_TO_PRIMARY[tag]
          if (primary) primaryCandidates.add(primary)
        }
        matched = true
      }
    }

    if (!matched) {
      // Keep unmapped genres as-is for manual review
      tags.add(genre)
    }
  }

  // Pick primaryTag: first match in priority order
  let primaryTag = DEFAULT_PRIMARY
  for (const candidate of PRIMARY_PRIORITY) {
    if (primaryCandidates.has(candidate)) {
      primaryTag = candidate
      break
    }
  }

  return {
    tags: [...tags],
    primaryTag,
  }
}
