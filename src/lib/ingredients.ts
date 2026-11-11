export type IngredientInput = {
  name: string
  quantity: number | null
  unit: string | null
}

const UNIT_ALIASES: Record<string, string> = {
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  cup: 'cup', cups: 'cup',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  clove: 'clove', cloves: 'clove',
  can: 'can', cans: 'can',
  slice: 'slice', slices: 'slice',
  piece: 'piece', pieces: 'piece',
  bunch: 'bunch', bunches: 'bunch',
  pinch: 'pinch', pinches: 'pinch',
  stick: 'stick', sticks: 'stick',
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4,
  '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
}

const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join('')

// "1 1/2", "1/2", "1.5", "1½", "½"
const QUANTITY_PATTERN = new RegExp(
  `^(\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d*\\.?\\d+\\s*[${FRACTION_CHARS}]?|[${FRACTION_CHARS}])\\s*(.*)$`,
)

/** The canonical spelling of a unit ("Tablespoons" -> "tbsp"), or null for none. */
export function normalizeUnit(unit: string | null | undefined): string | null {
  const cleaned = (unit ?? '').trim().toLowerCase().replace(/\.$/, '')
  if (cleaned === '') return null
  return UNIT_ALIASES[cleaned] ?? cleaned
}

export function parseQuantity(text: string): number | null {
  let total = 0
  let found = false
  for (const part of text.trim().split(/\s+|(?=[½⅓⅔¼¾⅛⅜⅝⅞])/)) {
    if (part === '') continue
    if (part in UNICODE_FRACTIONS) {
      total += UNICODE_FRACTIONS[part]
    } else if (/^\d+\/\d+$/.test(part)) {
      const [numerator, denominator] = part.split('/').map(Number)
      if (denominator === 0) return null
      total += numerator / denominator
    } else if (/^\d*\.?\d+$/.test(part)) {
      total += Number(part)
    } else {
      return null
    }
    found = true
  }
  return found ? total : null
}

/**
 * Parse one line of a recipe's ingredient list, such as "1 1/2 cups flour".
 * A line with no leading number is an ingredient without a quantity ("salt").
 */
export function parseIngredientLine(line: string): IngredientInput | null {
  const text = line.trim().replace(/^[-*•]\s*/, '')
  if (text === '') return null

  const match = QUANTITY_PATTERN.exec(text)
  if (!match) return { name: text, quantity: null, unit: null }

  const quantity = parseQuantity(match[1])
  const rest = match[2].trim()
  if (quantity === null || rest === '') {
    return { name: text, quantity: null, unit: null }
  }

  const [firstWord, ...otherWords] = rest.split(/\s+/)
  const unitKey = firstWord.toLowerCase().replace(/\.$/, '')
  if (unitKey in UNIT_ALIASES && otherWords.length > 0) {
    const name = otherWords.join(' ').replace(/^of\s+/i, '')
    return { name, quantity, unit: UNIT_ALIASES[unitKey] }
  }
  return { name: rest, quantity, unit: null }
}

export function parseIngredientLines(text: string): IngredientInput[] {
  return text
    .split('\n')
    .map(parseIngredientLine)
    .filter((ingredient) => ingredient !== null)
}

export function formatQuantity(quantity: number): string {
  return String(Math.round(quantity * 100) / 100)
}

export function formatIngredient(ingredient: IngredientInput): string {
  return [
    ingredient.quantity === null ? null : formatQuantity(ingredient.quantity),
    ingredient.unit,
    ingredient.name,
  ]
    .filter(Boolean)
    .join(' ')
}
