import type { Entity } from '../types'

export interface TagTrendPoint {
  bucket: number
  count: number
}

export interface TagTrend {
  tag: string
  data: TagTrendPoint[]
}

export interface TagTrendsData {
  buckets: number[]
  tags: TagTrend[]
}

export function buildTagTrends(games: Entity[], topN = 10): TagTrendsData {
  if (games.length === 0) return { buckets: [], tags: [] }

  // Count total occurrences of each tag
  const tagCounts = new Map<string, number>()
  for (const g of games) {
    for (const t of g.tags) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
    }
  }

  // Top N tags by count
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([tag]) => tag)

  // Determine bucket range
  const years = games.map(g => parseInt(g.date.slice(0, 4)))
  const minBucket = Math.floor(Math.min(...years) / 5) * 5
  const maxBucket = Math.floor(Math.max(...years) / 5) * 5
  const buckets: number[] = []
  for (let b = minBucket; b <= maxBucket; b += 5) {
    buckets.push(b)
  }

  // Count games per tag per bucket
  const tagBucketCounts = new Map<string, Map<number, number>>()
  for (const tag of topTags) {
    tagBucketCounts.set(tag, new Map())
  }

  for (const g of games) {
    const bucket = Math.floor(parseInt(g.date.slice(0, 4)) / 5) * 5
    for (const t of g.tags) {
      const bucketMap = tagBucketCounts.get(t)
      if (bucketMap) {
        bucketMap.set(bucket, (bucketMap.get(bucket) ?? 0) + 1)
      }
    }
  }

  // Build trend data with zero-filling
  const tags: TagTrend[] = topTags.map(tag => ({
    tag,
    data: buckets.map(bucket => ({
      bucket,
      count: tagBucketCounts.get(tag)?.get(bucket) ?? 0,
    })),
  }))

  return { buckets, tags }
}
