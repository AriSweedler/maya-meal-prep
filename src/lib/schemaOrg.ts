// The stored form of a recipe: a schema.org Recipe document
// (https://schema.org/Recipe), the same structure recipe sites publish.

export type SchemaOrgRecipe = Record<string, unknown>

export type RecipeFields = {
  title: string
  servings: number
  /** One ingredient per entry, worded as the user or the source wrote it. */
  ingredientLines: string[]
  /** Steps, one per line; a leading "1. " numbering is dropped. */
  instructions: string
  prepMinutes: number | null
  cookMinutes: number | null
  totalMinutes: number | null
  sourceUrl: string
}

/** Minutes as an ISO 8601 duration: 90 -> "PT1H30M". */
export function minutesToDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `PT${hours ? `${hours}H` : ''}${rest || !hours ? `${rest}M` : ''}`
}

function setOrRemove(document: SchemaOrgRecipe, key: string, value: unknown): void {
  if (value === null || value === '') delete document[key]
  else document[key] = value
}

/**
 * The schema.org document for a recipe. `base` is the document it already
 * has (from an import or an earlier save); everything in it that the app does
 * not edit, such as the image, author and nutrition, is kept as it was.
 */
export function buildSchemaOrgRecipe(
  base: SchemaOrgRecipe | null,
  fields: RecipeFields,
): SchemaOrgRecipe {
  const document: SchemaOrgRecipe = { '@context': 'https://schema.org', ...base }
  document['@type'] = base?.['@type'] ?? 'Recipe'
  document.name = fields.title.trim()
  document.recipeYield = `${fields.servings} servings`
  document.recipeIngredient = fields.ingredientLines.map((line) => line.trim()).filter(Boolean)
  document.recipeInstructions = stepLines(fields.instructions).map((text) => ({
    '@type': 'HowToStep',
    text,
  }))
  const duration = (minutes: number | null) =>
    minutes === null ? null : minutesToDuration(minutes)
  setOrRemove(document, 'prepTime', duration(fields.prepMinutes))
  setOrRemove(document, 'cookTime', duration(fields.cookMinutes))
  setOrRemove(document, 'totalTime', duration(fields.totalMinutes))
  setOrRemove(document, 'url', fields.sourceUrl.trim())
  return document
}

/** The ingredient lines a stored document holds, or null when it has none. */
export function ingredientLinesOf(document: unknown): string[] | null {
  if (typeof document !== 'object' || document === null) return null
  const lines = (document as SchemaOrgRecipe).recipeIngredient
  if (!Array.isArray(lines) || lines.length === 0) return null
  return lines.every((line) => typeof line === 'string') ? (lines as string[]) : null
}

/** Steps typed one per line, without any "1. " numbering. */
export function stepLines(instructions: string): string[] {
  return instructions
    .split('\n')
    .map((step) => step.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean)
}

/**
 * The steps of a stored document. schema.org holds them as a list, of
 * HowToStep objects or plain strings, so they are shown as a list too.
 * Null when the document has none.
 */
export function stepsOf(document: unknown): string[] | null {
  if (typeof document !== 'object' || document === null) return null
  const list = (document as SchemaOrgRecipe).recipeInstructions
  if (!Array.isArray(list)) return null
  const steps = list
    .map((step) => (typeof step === 'string' ? step : (step as { text?: unknown })?.text))
    .filter((text): text is string => typeof text === 'string' && text.trim() !== '')
  return steps.length > 0 ? steps : null
}
