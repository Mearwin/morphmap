import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const CACHE_DIR = join(import.meta.dirname, '..', '..', 'src', 'data', '.cache')
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export function getCached(key: string): string | null {
  const filePath = join(CACHE_DIR, `${key}.json`)
  if (!existsSync(filePath)) return null

  const stat = statSync(filePath)
  if (Date.now() - stat.mtimeMs > MAX_AGE_MS) return null

  return readFileSync(filePath, 'utf-8')
}

export function setCache(key: string, data: string): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true })
  }
  writeFileSync(join(CACHE_DIR, `${key}.json`), data)
}
