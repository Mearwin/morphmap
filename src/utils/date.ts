/** Extract the four-digit year from an ISO date string (e.g. "2011-09-22" → 2011). */
export function getYear(date: string): number {
  return parseInt(date.slice(0, 4), 10)
}
