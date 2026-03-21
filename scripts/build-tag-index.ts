import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Entity } from '../src/types.ts'
import { buildTagIndex, computeNormParamsFromIndex, computeTagPositionsFromIndex } from '../src/utils/tagColor.ts'

interface TagIndexData {
  orderedTags: string[]
  normMin: number
  normRange: number
  tagPositions: Record<string, number>
}

export function buildTagIndexData(games: Entity[]): TagIndexData {
  const { tagIndex, totalTags, orderedTags } = buildTagIndex(games)
  const { min: normMin, range: normRange } = computeNormParamsFromIndex(games, tagIndex, totalTags)
  const positions = computeTagPositionsFromIndex(games, tagIndex, totalTags)

  const tagPositions: Record<string, number> = {}
  for (const [id, pos] of positions) {
    tagPositions[id] = pos
  }

  return { orderedTags, normMin, normRange, tagPositions }
}

// CLI entry point
const isMain =
  process.argv[1]?.endsWith('build-tag-index.ts') ||
  process.argv[1]?.endsWith('build-tag-index.js')

if (isMain) {
  const gamesPath = join(import.meta.dirname, '..', 'src', 'data', 'games.json')
  const outPath = join(import.meta.dirname, '..', 'src', 'data', 'tag-index.json')

  const raw = readFileSync(gamesPath, 'utf-8')
  const games: Entity[] = JSON.parse(raw)

  const data = buildTagIndexData(games)
  writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n')

  console.log(
    `✓ Built tag index: ${data.orderedTags.length} tags, ` +
    `${Object.keys(data.tagPositions).length} game positions → src/data/tag-index.json`
  )
}
