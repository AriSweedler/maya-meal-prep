/**
 * Score how well `query` matches `text` as a fuzzy subsequence: every query
 * character must appear in order ("chk tco" matches "Chicken tacos").
 * Higher is better; null means no match. Matches at the start of a word and
 * runs of consecutive characters score higher, so "tac" ranks "Tacos" above
 * "Steak and cabbage".
 */
export function fuzzyScore(query: string, text: string): number | null {
  const needle = query.toLowerCase().replace(/\s+/g, '')
  const haystack = text.toLowerCase()
  if (needle === '') return 0

  let score = 0
  let position = 0
  let previousMatch = -2
  for (const char of needle) {
    const found = haystack.indexOf(char, position)
    if (found === -1) return null
    const startsWord = found === 0 || /[\s\-_/(]/.test(haystack[found - 1])
    if (found === previousMatch + 1) score += 3
    if (startsWord) score += 2
    score -= (found - position) * 0.1
    previousMatch = found
    position = found + 1
  }
  return score
}

/** The items whose label matches the query, best match first. */
export function fuzzyFilter<T>(items: T[], query: string, label: (item: T) => string): T[] {
  return items
    .flatMap((item) => {
      const score = fuzzyScore(query, label(item))
      return score === null ? [] : [{ item, score }]
    })
    .sort((a, b) => b.score - a.score || label(a.item).localeCompare(label(b.item)))
    .map(({ item }) => item)
}
