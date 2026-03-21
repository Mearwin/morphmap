import type { Entity } from '../types'

/**
 * Compute the Fiedler vector (2nd smallest eigenvector of the Laplacian)
 * using inverse power iteration with shift. This gives the optimal 1D
 * ordering that keeps co-occurring tags close together.
 *
 * For N tags, the Laplacian L = D - W where W is co-occurrence weights
 * and D is the diagonal degree matrix.
 *
 * We find the eigenvector for the smallest non-trivial eigenvalue by
 * shifting: solve (L - σI)^{-1} iteratively, where σ ≈ 0 (small shift).
 *
 * Since N ≤ 500 here, we use a simple approach: power iteration on
 * L directly to find the Fiedler vector, deflating the trivial eigenvector.
 */
function spectralOrder(tags: string[], cooccurrence: Map<string, Map<string, number>>): string[] {
  const n = tags.length
  if (n <= 2) return tags

  // Build adjacency matrix W and degree matrix D
  const W: number[][] = Array.from({ length: n }, () => new Float64Array(n) as unknown as number[])
  const tagIdx = new Map(tags.map((t, i) => [t, i]))

  for (const [t1, neighbors] of cooccurrence) {
    const i = tagIdx.get(t1)
    if (i === undefined) continue
    for (const [t2, weight] of neighbors) {
      const j = tagIdx.get(t2)
      if (j === undefined) continue
      W[i][j] = weight
    }
  }

  // Laplacian L = D - W
  const L: number[][] = Array.from({ length: n }, () => new Float64Array(n) as unknown as number[])
  for (let i = 0; i < n; i++) {
    let degree = 0
    for (let j = 0; j < n; j++) {
      degree += W[i][j]
      L[i][j] = -W[i][j]
    }
    L[i][i] = degree
  }

  // Power iteration to find the Fiedler vector.
  // We want the eigenvector of the smallest non-zero eigenvalue.
  // Strategy: iterate on L directly, but after each step, project out
  // the trivial eigenvector (constant vector) so we converge to the
  // 2nd smallest instead.

  // Initialize with a non-constant vector
  let v = new Float64Array(n)
  for (let i = 0; i < n; i++) v[i] = Math.sin((i + 1) * 7.3) + Math.cos((i + 1) * 3.1)

  // Remove constant component
  function deflate(vec: Float64Array): void {
    let sum = 0
    for (let i = 0; i < n; i++) sum += vec[i]
    const mean = sum / n
    for (let i = 0; i < n; i++) vec[i] -= mean
  }

  // Normalize
  function normalize(vec: Float64Array): void {
    let norm = 0
    for (let i = 0; i < n; i++) norm += vec[i] * vec[i]
    norm = Math.sqrt(norm)
    if (norm > 1e-12) {
      for (let i = 0; i < n; i++) vec[i] /= norm
    }
  }

  deflate(v)
  normalize(v)

  // Inverse iteration with a small shift to find the smallest non-trivial eigenvalue.
  // We solve (L - σI)x = v each iteration. With σ close to 0, this converges
  // to the Fiedler vector.
  //
  // For simplicity and since n ≤ 500, we use direct Gauss elimination each step.
  // But that's expensive (O(n^3) per iteration). Instead, let's use a simpler
  // approach: Lanczos-like power iteration on L itself.
  //
  // Actually, the simplest correct approach: repeated multiplication by L,
  // deflating the constant vector, gives us the LARGEST eigenvector of L.
  // We want the smallest non-trivial one.
  //
  // Better approach: use (maxEig * I - L) which flips the spectrum.
  // The Fiedler vector of L becomes the dominant non-trivial eigenvector of (maxEig*I - L).

  // Estimate max eigenvalue via Gershgorin: max diagonal entry + max off-diagonal sum
  let maxEig = 0
  for (let i = 0; i < n; i++) {
    maxEig = Math.max(maxEig, L[i][i])
  }
  // Use 1.1 * maxEig for safety margin
  maxEig *= 1.1

  // Power iteration on M = maxEig*I - L
  const MAX_ITER = 200
  const result = new Float64Array(n)

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // result = M * v = maxEig * v - L * v
    for (let i = 0; i < n; i++) {
      let sum = 0
      for (let j = 0; j < n; j++) {
        sum += L[i][j] * v[j]
      }
      result[i] = maxEig * v[i] - sum
    }

    // Deflate constant component
    deflate(result)
    normalize(result)

    // Copy back
    for (let i = 0; i < n; i++) v[i] = result[i]
  }

  // v now approximates the Fiedler vector. Sort tags by their component.
  const indexed = tags.map((tag, i) => ({ tag, value: v[i] }))
  indexed.sort((a, b) => a.value - b.value)

  return indexed.map(x => x.tag)
}

/**
 * Build a spectrally-ordered tag list and index from games.
 * Tags are ordered by co-occurrence similarity (spectral seriation),
 * so tags that appear on the same games are adjacent.
 */
export function buildTagIndex(games: Entity[]): { tagIndex: Map<string, number>; totalTags: number; orderedTags: string[] } {
  // Collect all tags
  const allTags = new Set<string>()
  for (const g of games) for (const t of g.tags) allTags.add(t)
  const tagList = [...allTags].sort() // alphabetical as initial ordering

  // Build co-occurrence matrix
  const cooccurrence = new Map<string, Map<string, number>>()
  for (const tag of tagList) cooccurrence.set(tag, new Map())

  for (const g of games) {
    const tags = g.tags
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const a = tags[i], b = tags[j]
        const mapA = cooccurrence.get(a)!
        const mapB = cooccurrence.get(b)!
        mapA.set(b, (mapA.get(b) ?? 0) + 1)
        mapB.set(a, (mapB.get(a) ?? 0) + 1)
      }
    }
  }

  // Spectral ordering
  const orderedTags = spectralOrder(tagList, cooccurrence)
  const tagIndex = new Map(orderedTags.map((t, i) => [t, i]))

  return { tagIndex, totalTags: orderedTags.length, orderedTags }
}

/**
 * Compute a normalized tag position [0, 1] for each game using a pre-computed tag index.
 */
export function computeTagPositionsFromIndex(
  games: Entity[],
  tagIndex: Map<string, number>,
  totalTags: number,
): Map<string, number> {
  if (games.length === 0) return new Map()

  // First pass: compute raw average positions
  const rawPositions: { id: string; pos: number }[] = []
  for (const g of games) {
    const indices = g.tags.map(t => tagIndex.get(t)!).filter(i => i !== undefined)
    const avg = indices.length > 0
      ? indices.reduce((a, b) => a + b, 0) / indices.length
      : 0
    rawPositions.push({ id: g.id, pos: totalTags > 0 ? avg / totalTags : 0 })
  }

  // Second pass: stretch to [0, 1] using actual min/max
  let min = Infinity
  let max = -Infinity
  for (const { pos } of rawPositions) {
    if (pos < min) min = pos
    if (pos > max) max = pos
  }
  const range = max - min || 1

  const positions = new Map<string, number>()
  for (const { id, pos } of rawPositions) {
    positions.set(id, (pos - min) / range)
  }
  return positions
}

/**
 * Convenience wrapper — builds tag index internally.
 */
export function computeTagPositions(games: Entity[]): Map<string, number> {
  const { tagIndex, totalTags } = buildTagIndex(games)
  return computeTagPositionsFromIndex(games, tagIndex, totalTags)
}

/**
 * Get the HSL color string for a given normalized position [0, 1].
 */
export function hslFromPosition(position: number): string {
  const hue = Math.round(position * 360)
  return `hsl(${hue}, 70%, 55%)`
}

/**
 * For a single game, compute the normalized position of each of its tags
 * on the global spectrum, plus the average. Used by the color explainer.
 */
export function explainGameColor(
  gameTags: string[],
  tagIndex: Map<string, number>,
  totalTags: number,
  normMin: number,
  normRange: number,
): { tagPositions: { tag: string; position: number }[]; average: number } {
  const tagPositions = gameTags
    .map(tag => {
      const idx = tagIndex.get(tag)
      if (idx === undefined) return null
      const raw = idx / totalTags
      return { tag, position: (raw - normMin) / normRange }
    })
    .filter(Boolean) as { tag: string; position: number }[]

  const avg = tagPositions.length > 0
    ? tagPositions.reduce((s, t) => s + t.position, 0) / tagPositions.length
    : 0.5

  return { tagPositions, average: Math.max(0, Math.min(1, avg)) }
}

/**
 * Compute normalization params using a pre-computed tag index.
 */
export function computeNormParamsFromIndex(
  games: Entity[],
  tagIndex: Map<string, number>,
  totalTags: number,
): { min: number; range: number } {
  let min = Infinity
  let max = -Infinity
  for (const g of games) {
    const indices = g.tags.map(t => tagIndex.get(t)!).filter(i => i !== undefined)
    if (indices.length === 0) continue
    const avg = indices.reduce((a, b) => a + b, 0) / indices.length
    const pos = avg / totalTags
    if (pos < min) min = pos
    if (pos > max) max = pos
  }
  return { min: min === Infinity ? 0 : min, range: (max - min) || 1 }
}

/**
 * Convenience wrapper — builds tag index internally.
 */
export function computeNormParams(games: Entity[]): { min: number; range: number } {
  const { tagIndex, totalTags } = buildTagIndex(games)
  return computeNormParamsFromIndex(games, tagIndex, totalTags)
}

/**
 * Compute colors from pre-computed positions.
 */
export function computeTagColorsFromPositions(positions: Map<string, number>): Map<string, string> {
  const colors = new Map<string, string>()
  for (const [id, pos] of positions) {
    colors.set(id, hslFromPosition(pos))
  }
  return colors
}

/**
 * Convenience wrapper — computes positions internally.
 */
export function computeTagColors(games: Entity[]): Map<string, string> {
  return computeTagColorsFromPositions(computeTagPositions(games))
}
