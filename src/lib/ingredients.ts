import { getQuantityStyle, type QuantityStyle } from './preferences'

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

  // "1 (28-ounce) can tomatoes": the size note sits between the count and the unit.
  const sized = /^(\([^)]*\))\s+(.*)$/.exec(rest)
  const note = sized ? ` ${sized[1]}` : ''
  const [firstWord, ...otherWords] = (sized ? sized[2] : rest).split(/\s+/)
  const unitKey = firstWord.toLowerCase().replace(/\.$/, '')
  if (unitKey in UNIT_ALIASES && otherWords.length > 0) {
    const name = otherWords.join(' ').replace(/^of\s+/i, '') + note
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

const MAX_DENOMINATOR = 100
const FRACTION_TOLERANCE = 1e-4

export type Fraction = { whole: number; numerator: number; denominator: number }

/**
 * A quantity as a whole number plus a fraction, using the smallest
 * denominator up to 100 that matches it: 7/6 -> 1 and 1/6. The numerator is
 * 0 for a whole number. Null when no such fraction matches.
 */
export function fractionParts(quantity: number): Fraction | null {
  const whole = Math.floor(quantity + FRACTION_TOLERANCE)
  const rest = quantity - whole
  if (Math.abs(rest) < FRACTION_TOLERANCE) return { whole, numerator: 0, denominator: 1 }
  for (let denominator = 2; denominator <= MAX_DENOMINATOR; denominator++) {
    const numerator = Math.round(rest * denominator)
    if (numerator > 0 && Math.abs(rest - numerator / denominator) < FRACTION_TOLERANCE) {
      return { whole, numerator, denominator }
    }
  }
  return null
}

/** The fraction as plain text, "1 1/6", for copying and editing. */
export function toFraction(quantity: number): string | null {
  const parts = fractionParts(quantity)
  if (!parts) return null
  if (parts.numerator === 0) return String(parts.whole)
  const fraction = `${parts.numerator}/${parts.denominator}`
  return parts.whole === 0 ? fraction : `${parts.whole} ${fraction}`
}

/** An amount for display: a fraction when one fits and the user has not chosen decimals. */
export function formatQuantity(
  quantity: number,
  style: QuantityStyle = getQuantityStyle(),
): string {
  const decimal = String(Math.round(quantity * 100) / 100)
  if (style === 'decimals') return decimal
  return toFraction(quantity) ?? decimal
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

const SMALL_UNITS = new Set(['tsp', 'pinch', 'dash', 'sprig', 'leaf'])

// Seasonings and pantry staples: needed, but not what a recipe is "made of".
const SEASONING_PATTERN = new RegExp(
  '\\b(' +
    [
      'salt', '(black|white|ground|cracked|cayenne) pepper', 'peppercorns?', 'paprika', 'cumin', 'coriander', 'turmeric', 'cinnamon',
      'nutmeg', 'cloves?', 'cardamom', 'allspice', 'oregano', 'thyme', 'rosemary', 'sage',
      'bay lea(f|ves)', 'chil[ei] (powder|flakes)', 'red pepper flakes', 'cayenne',
      'garlic powder', 'onion powder', 'curry powder', 'garam masala', 'za.?atar', 'sumac',
      'seasoning', 'spice', 'vanilla', 'extract', 'baking (soda|powder)', 'cornstarch',
      'oil', 'cooking spray', 'vinegar', 'water', 'ice',
    ].join('|') +
    ')\\b',
  'i',
)

/**
 * Whether an ingredient is one of the recipe's main ones, for a short
 * summary: it has an amount, the amount is not spoon-sized, and it is not a
 * seasoning or pantry staple. A heuristic; the full list is always available.
 */
export function isMainIngredient(ingredient: IngredientInput): boolean {
  if (ingredient.quantity === null) return false
  const unit = normalizeUnit(ingredient.unit)
  if (unit !== null && SMALL_UNITS.has(unit)) return false
  // A quarter cup or more counts; a spoonful or two does not.
  if (unit === 'tbsp' && ingredient.quantity < 4) return false
  // "pepper" alone is the seasoning; "bell pepper" is a vegetable.
  if (/^(freshly ground )?pepper$/i.test(ingredient.name.trim())) return false
  return !SEASONING_PATTERN.test(ingredient.name)
}

/** An ingredient's name without its preparation notes: "shallots, finely chopped (2 medium)" -> "shallots". */
export function shortName(name: string): string {
  return name.replace(/\([^)]*\)/g, '').split(',')[0].trim()
}
