/**
 * Build-time script that fetches cover art URLs from IGDB and writes them
 * into individual game files under src/data/games/.
 *
 * Usage:
 *   1. Create a Twitch Developer app at https://dev.twitch.tv/console/apps
 *   2. Copy .env.example to .env and fill in your client ID & secret
 *   3. Run: npm run fetch-covers
 *
 * The script is idempotent — it skips games that already have an imageUrl.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const GAMES_DIR = resolve(import.meta.dirname!, '..', 'src', 'data', 'games')
const IGDB_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const IGDB_API_URL = 'https://api.igdb.com/v4'
const COVER_CDN = 'https://images.igdb.com/igdb/image/upload/t_cover_big'

// Rate limit: max 4 requests/second
const REQUEST_DELAY_MS = 260

interface GameEntry {
  id: string
  title: string
  date: string
  imageUrl?: string
  [key: string]: unknown
}

function loadEnv(): { clientId: string; clientSecret: string } {
  const envPath = resolve(import.meta.dirname!, '..', '.env')
  let raw: string
  try {
    raw = readFileSync(envPath, 'utf-8')
  } catch {
    console.error('Missing .env file. Copy .env.example to .env and fill in your credentials.')
    process.exit(1)
  }

  const vars: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const match = line.match(/^(\w+)=(.*)$/)
    if (match) vars[match[1]] = match[2].trim()
  }

  const clientId = vars.IGDB_CLIENT_ID
  const clientSecret = vars.IGDB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('IGDB_CLIENT_ID and IGDB_CLIENT_SECRET must be set in .env')
    process.exit(1)
  }
  return { clientId, clientSecret }
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(
    `${IGDB_TOKEN_URL}?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: 'POST' }
  )
  if (!res.ok) {
    throw new Error(`Failed to get access token: ${res.status} ${await res.text()}`)
  }
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

async function searchGame(
  title: string,
  year: number,
  clientId: string,
  accessToken: string
): Promise<string | null> {
  // Strip parenthetical suffixes like "(2018)" or "(Remake)" for cleaner search
  const cleanTitle = title.replace(/\s*\([^)]+\)\s*$/, '')
  const body = `search "${cleanTitle}"; fields name,cover.image_id,first_release_date; where cover != null; limit 10;`

  const res = await fetch(`${IGDB_API_URL}/games`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'text/plain',
    },
    body,
  })

  if (!res.ok) {
    console.warn(`  API error for "${title}": ${res.status}`)
    return null
  }

  const results = (await res.json()) as Array<{
    name: string
    cover?: { image_id: string }
    first_release_date?: number
  }>

  if (results.length === 0) return null

  // Try to find a match close to the expected release year
  const bestMatch = results.find((r) => {
    if (!r.cover?.image_id) return false
    if (r.first_release_date) {
      const rYear = new Date(r.first_release_date * 1000).getFullYear()
      return Math.abs(rYear - year) <= 1
    }
    return r.name.toLowerCase() === cleanTitle.toLowerCase()
  }) ?? results.find((r) => r.cover?.image_id)

  return bestMatch?.cover?.image_id ?? null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const { clientId, clientSecret } = loadEnv()

  console.log('Authenticating with IGDB...')
  const accessToken = await getAccessToken(clientId, clientSecret)
  console.log('Authenticated.\n')

  const files = readdirSync(GAMES_DIR).filter(f => f.endsWith('.json')).sort()
  const games: { file: string; game: GameEntry }[] = files.map(file => ({
    file,
    game: JSON.parse(readFileSync(join(GAMES_DIR, file), 'utf-8')) as GameEntry,
  }))

  const toFetch = games.filter(({ game }) => !game.imageUrl)

  console.log(`${games.length} games total, ${toFetch.length} missing cover art.\n`)

  if (toFetch.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const misses: string[] = []
  let fetched = 0

  for (const { file, game } of toFetch) {
    const year = parseInt(game.date.slice(0, 4), 10)
    const imageId = await searchGame(game.title, year, clientId, accessToken)

    if (imageId) {
      game.imageUrl = `${COVER_CDN}/${imageId}.jpg`
      writeFileSync(join(GAMES_DIR, file), JSON.stringify(game, null, 2) + '\n')
      fetched++
      console.log(`  ✓ ${game.title} → ${imageId}`)
    } else {
      misses.push(game.id)
      console.log(`  ✗ ${game.title} — no cover found`)
    }

    await sleep(REQUEST_DELAY_MS)
  }

  console.log(`\nDone. Fetched ${fetched} covers.`)
  if (misses.length > 0) {
    console.log(`\nMissing covers (${misses.length}):`)
    for (const id of misses) {
      console.log(`  - ${id}`)
    }
    console.log('\nYou can manually add imageUrl for these in src/data/games/.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
