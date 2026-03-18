/**
 * Lightweight fuzzy string matching.
 * Returns a score >= 0 if the pattern matches the text, or -1 if no match.
 * Higher scores = better match.
 *
 * Bonuses:
 *  - Consecutive character matches
 *  - Match at start of word (after space, hyphen, or at index 0)
 *  - Match at start of string
 *
 * Penalties:
 *  - Gaps between matched characters
 */
export function fuzzyScore(pattern: string, text: string): number {
  const p = pattern.toLowerCase()
  const t = text.toLowerCase()

  if (p.length === 0) return 0
  if (p.length > t.length) return -1

  // Quick check: are all pattern chars present in order?
  let pi = 0
  for (let ti = 0; ti < t.length && pi < p.length; ti++) {
    if (t[ti] === p[pi]) pi++
  }
  if (pi < p.length) return -1

  // Score the match
  let score = 0
  let prevMatchIdx = -2
  pi = 0

  for (let ti = 0; ti < t.length && pi < p.length; ti++) {
    if (t[ti] !== p[pi]) continue

    // Base score for a match
    score += 1

    // Consecutive match bonus
    if (ti === prevMatchIdx + 1) {
      score += 5
    }

    // Word boundary bonus
    if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '-' || t[ti - 1] === ':') {
      score += 3
    }

    // Penalty for gap
    if (prevMatchIdx >= 0 && ti > prevMatchIdx + 1) {
      score -= (ti - prevMatchIdx - 1) * 0.3
    }

    prevMatchIdx = ti
    pi++
  }

  return score
}

/** Returns the indices of matched characters in `text`, or null if no match. */
export function fuzzyMatchIndices(pattern: string, text: string): number[] | null {
  const p = pattern.toLowerCase()
  const t = text.toLowerCase()

  if (p.length === 0) return []
  if (p.length > t.length) return null

  const indices: number[] = []
  let pi = 0
  for (let ti = 0; ti < t.length && pi < p.length; ti++) {
    if (t[ti] === p[pi]) {
      indices.push(ti)
      pi++
    }
  }
  return pi === p.length ? indices : null
}

export type FuzzyResult<T> = { item: T; score: number; indices: number[] }

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
  limit: number = 8,
): FuzzyResult<T>[] {
  if (query.length < 1) return []

  const results: FuzzyResult<T>[] = []
  for (const item of items) {
    const score = fuzzyScore(query, getText(item))
    if (score >= 0) {
      const indices = fuzzyMatchIndices(query, getText(item)) ?? []
      results.push({ item, score, indices })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, limit)
}
