// Reads a recipe out of a web page's schema.org structured data (JSON-LD),
// which most recipe sites publish. Pure TypeScript with no runtime APIs, so
// the edge function and the unit tests share it.

export type ImportedRecipe = {
  title: string
  /** Portions the recipe makes, or null when the page does not say. */
  servings: number | null
  /** One ingredient per entry, as the page words it: "1 1/2 cups rice". */
  ingredients: string[]
  /** Steps, one per line, numbered. */
  instructions: string
  prepMinutes: number | null
  cookMinutes: number | null
  totalMinutes: number | null
  /** The page's whole schema.org Recipe node, unchanged, for the app to store. */
  schemaOrg: Record<string, unknown>
}

type Json = unknown
type JsonObject = Record<string, Json>

function isObject(value: Json): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&apos;': "'", '&nbsp;': ' ',
}

/** Plain text from a value that may hold HTML tags and entities. */
export function cleanText(value: Json): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (entity) => ENTITIES[entity])
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim()
}

/** Minutes in an ISO 8601 duration such as "PT1H30M"; null when absent or malformed. */
export function parseDurationMinutes(value: Json): number | null {
  if (typeof value !== 'string') return null
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+(?:\.\d+)?S)?)?$/.exec(value.trim())
  if (!match || !(match[1] || match[2] || match[3])) return null
  const minutes =
    Number(match[1] ?? 0) * 24 * 60 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
  return minutes > 0 ? minutes : null
}

/** The first number in a yield such as "4 servings", ["6", "6 bowls"] or 8. */
export function parseServings(value: Json): number | null {
  for (const candidate of Array.isArray(value) ? value : [value]) {
    if (typeof candidate === 'number' && candidate > 0) return candidate
    if (typeof candidate === 'string') {
      const match = /\d+(?:\.\d+)?/.exec(candidate)
      if (match && Number(match[0]) > 0) return Number(match[0])
    }
  }
  return null
}

/** Flatten instructions given as text, steps, or sections of steps. */
function instructionSteps(value: Json): string[] {
  if (typeof value === 'string') {
    return value.split(/\n+/).map(cleanText).filter(Boolean)
  }
  if (Array.isArray(value)) return value.flatMap(instructionSteps)
  if (isObject(value)) {
    if (value.itemListElement) return instructionSteps(value.itemListElement)
    const text = cleanText(value.text ?? value.name)
    return text ? [text] : []
  }
  return []
}

function hasType(node: JsonObject, type: string): boolean {
  const types = node['@type']
  return Array.isArray(types) ? types.includes(type) : types === type
}

/** Find the Recipe node anywhere in a JSON-LD document, including @graph. */
function findRecipe(node: Json): JsonObject | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item)
      if (found) return found
    }
    return null
  }
  if (!isObject(node)) return null
  if (hasType(node, 'Recipe')) return node
  return findRecipe(node['@graph'] ?? null)
}

export function recipeFromJsonLd(document: Json): ImportedRecipe | null {
  const recipe = findRecipe(document)
  if (!recipe) return null

  const title = cleanText(recipe.name)
  const ingredientList = recipe.recipeIngredient ?? recipe.ingredients
  const ingredients = (Array.isArray(ingredientList) ? ingredientList : [])
    .map(cleanText)
    .filter(Boolean)
  if (!title || ingredients.length === 0) return null

  return {
    title,
    servings: parseServings(recipe.recipeYield),
    ingredients,
    instructions: instructionSteps(recipe.recipeInstructions)
      .map((step, index) => `${index + 1}. ${step}`)
      .join('\n'),
    prepMinutes: parseDurationMinutes(recipe.prepTime),
    cookMinutes: parseDurationMinutes(recipe.cookTime),
    totalMinutes: parseDurationMinutes(recipe.totalTime),
    schemaOrg: recipe,
  }
}

/** The first recipe found in a page's JSON-LD script blocks, or null. */
export function recipeFromHtml(html: string): ImportedRecipe | null {
  const blocks = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )
  for (const [, body] of blocks) {
    let document: Json
    try {
      document = JSON.parse(body)
    } catch {
      continue
    }
    const recipe = recipeFromJsonLd(document)
    if (recipe) return recipe
  }
  return null
}

/**
 * Why a URL may not be fetched, or null when it may. Only public https pages:
 * the function must not be usable to reach private addresses.
 */
export function rejectUrl(input: string): string | null {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return 'That is not a valid link.'
  }
  if (url.protocol !== 'https:') return 'Only https links can be imported.'
  const host = url.hostname.toLowerCase()
  const isIpAddress = /^[\d.]+$/.test(host) || host.includes(':')
  const isPrivateName =
    host === 'localhost' || !host.includes('.') || /\.(local|internal|localhost)$/.test(host)
  if (isIpAddress || isPrivateName) return 'That link cannot be imported.'
  return null
}
