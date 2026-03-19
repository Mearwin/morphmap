interface GenreResult {
  tags: string[]
}

// Map Wikidata genre labels -> our tags
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

export function mapGenres(wikidataGenres: string[]): GenreResult {
  const tags = new Set<string>()

  for (const genre of wikidataGenres) {
    const lower = genre.toLowerCase()
    let matched = false

    for (const [pattern, mappedTags] of GENRE_TAG_MAP) {
      if (lower.includes(pattern)) {
        for (const tag of mappedTags) {
          tags.add(tag)
        }
        matched = true
      }
    }

    if (!matched) {
      // Keep unmapped genres as-is for manual review
      tags.add(genre)
    }
  }

  return {
    tags: [...tags],
  }
}
