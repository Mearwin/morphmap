import { getCached, setCache } from './cache.js'

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql'
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export interface WikidataGame {
  qid: string
  title: string
  date: string | null // YYYY-MM-DD or null
  genres: string[]
}

async function sparqlQuery(query: string): Promise<Record<string, unknown>[]> {
  const url = new URL(SPARQL_ENDPOINT)
  url.searchParams.set('query', query)

  const res = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'User-Agent': USER_AGENT,
    },
  })

  if (!res.ok) {
    throw new Error(`Wikidata SPARQL error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json() as { results: { bindings: Record<string, unknown>[] } }
  return data.results.bindings
}

function bindingValue(binding: Record<string, unknown>, key: string): string | null {
  const entry = binding[key] as { value: string } | undefined
  return entry?.value ?? null
}

/**
 * Search Wikidata for a video game by title.
 * Returns matching games (instance of Q7889 = video game).
 */
export async function searchGame(title: string): Promise<WikidataGame[]> {
  const cacheKey = `search-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
  const cached = getCached(cacheKey)
  if (cached) return JSON.parse(cached) as WikidataGame[]

  // Use CONTAINS for fuzzy matching, filter to video games (Q7889)
  const query = `
    SELECT ?item ?itemLabel (MIN(?date) AS ?firstDate) (GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres) WHERE {
      ?item wdt:P31 wd:Q7889 .
      ?item rdfs:label ?label . FILTER(LANG(?label) = "en")
      FILTER(CONTAINS(LCASE(?label), ${JSON.stringify(title.toLowerCase())}))
      OPTIONAL { ?item wdt:P577 ?date }
      OPTIONAL {
        ?item wdt:P136 ?genre .
        ?genre rdfs:label ?genreLabel . FILTER(LANG(?genreLabel) = "en")
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }
    GROUP BY ?item ?itemLabel
    ORDER BY ?firstDate
    LIMIT 10
  `

  const bindings = await sparqlQuery(query)

  const results: WikidataGame[] = bindings.map(b => {
    const qid = (bindingValue(b, 'item') ?? '').split('/').pop() ?? ''
    const rawDate = bindingValue(b, 'firstDate')
    return {
      qid,
      title: bindingValue(b, 'itemLabel') ?? '',
      date: rawDate ? rawDate.slice(0, 10) : null,
      genres: (bindingValue(b, 'genres') ?? '').split('|').filter(Boolean),
    }
  })

  setCache(cacheKey, JSON.stringify(results))
  return results
}

/**
 * Fetch a specific game by Wikidata QID.
 */
export async function fetchGameByQid(qid: string): Promise<WikidataGame | null> {
  const cacheKey = `entity-${qid}`
  const cached = getCached(cacheKey)
  if (cached) return JSON.parse(cached) as WikidataGame

  const query = `
    SELECT ?itemLabel (MIN(?date) AS ?firstDate) (GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres) WHERE {
      VALUES ?item { wd:${qid} }
      OPTIONAL { ?item wdt:P577 ?date }
      OPTIONAL {
        ?item wdt:P136 ?genre .
        ?genre rdfs:label ?genreLabel . FILTER(LANG(?genreLabel) = "en")
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }
    GROUP BY ?itemLabel
  `

  const bindings = await sparqlQuery(query)
  if (bindings.length === 0) return null

  const b = bindings[0]
  const rawDate = bindingValue(b, 'firstDate')
  const result: WikidataGame = {
    qid,
    title: bindingValue(b, 'itemLabel') ?? '',
    date: rawDate ? rawDate.slice(0, 10) : null,
    genres: (bindingValue(b, 'genres') ?? '').split('|').filter(Boolean),
  }

  setCache(cacheKey, JSON.stringify(result))
  return result
}

/** Simple delay for rate limiting */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
