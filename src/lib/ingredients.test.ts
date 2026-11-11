import { describe, expect, it } from 'vitest'
import {
  formatIngredient,
  formatQuantity,
  toFraction,
  isMainIngredient,
  shortName,
  normalizeUnit,
  parseIngredientLine,
  parseIngredientLines,
  parseQuantity,
} from './ingredients'

describe('parseQuantity', () => {
  it.each([
    ['2', 2],
    ['1.5', 1.5],
    ['.5', 0.5],
    ['1/2', 0.5],
    ['1 1/2', 1.5],
    ['½', 0.5],
    ['1½', 1.5],
    ['1 ½', 1.5],
  ])('%s -> %d', (text, expected) => {
    expect(parseQuantity(text)).toBeCloseTo(expected)
  })

  it('rejects text that is not a number', () => {
    expect(parseQuantity('some')).toBeNull()
    expect(parseQuantity('1/0')).toBeNull()
  })
})

describe('normalizeUnit', () => {
  it('maps spellings to one unit', () => {
    expect(normalizeUnit('Tablespoons')).toBe('tbsp')
    expect(normalizeUnit('tbsp.')).toBe('tbsp')
    expect(normalizeUnit('lbs')).toBe('lb')
  })

  it('keeps unknown units and treats blank as none', () => {
    expect(normalizeUnit('handful')).toBe('handful')
    expect(normalizeUnit('  ')).toBeNull()
    expect(normalizeUnit(null)).toBeNull()
  })
})

describe('parseIngredientLine', () => {
  it('reads quantity, unit and name', () => {
    expect(parseIngredientLine('1 1/2 cups flour')).toEqual({
      quantity: 1.5, unit: 'cup', name: 'flour',
    })
    expect(parseIngredientLine('- 200g chicken thighs')).toEqual({
      quantity: 200, unit: 'g', name: 'chicken thighs',
    })
    expect(parseIngredientLine('2 cloves of garlic')).toEqual({
      quantity: 2, unit: 'clove', name: 'garlic',
    })
  })

  it('reads lines as recipe sites word them', () => {
    expect(parseIngredientLine('1 ⅓ cups heavy cream')).toEqual({
      quantity: 1 + 1 / 3, unit: 'cup', name: 'heavy cream',
    })
    expect(parseIngredientLine('1 (28-ounce) can whole tomatoes')).toEqual({
      quantity: 1, unit: 'can', name: 'whole tomatoes (28-ounce)',
    })
    expect(parseIngredientLine('2 medium shallots, finely chopped')).toEqual({
      quantity: 2, unit: null, name: 'medium shallots, finely chopped',
    })
  })

  it('reads a count with no unit', () => {
    expect(parseIngredientLine('2 large eggs')).toEqual({
      quantity: 2, unit: null, name: 'large eggs',
    })
  })

  it('reads an ingredient with no quantity', () => {
    expect(parseIngredientLine('salt to taste')).toEqual({
      quantity: null, unit: null, name: 'salt to taste',
    })
  })

  it('does not take the whole name as a unit', () => {
    expect(parseIngredientLine('2 cans')).toEqual({
      quantity: 2, unit: null, name: 'cans',
    })
  })

  it('skips blank lines', () => {
    expect(parseIngredientLine('   ')).toBeNull()
    expect(parseIngredientLines('1 cup rice\n\n2 eggs\n')).toHaveLength(2)
  })
})

describe('formatIngredient', () => {
  it('round-trips through the parser', () => {
    const line = formatIngredient({ quantity: 1.5, unit: 'cup', name: 'flour' })
    expect(line).toBe('1 1/2 cup flour')
    expect(parseIngredientLine(line)).toEqual({
      quantity: 1.5, unit: 'cup', name: 'flour',
    })
  })
})

describe('isMainIngredient', () => {
  const main = (line: string) => isMainIngredient(parseIngredientLine(line)!)

  it('keeps the ingredients a recipe is made of', () => {
    for (const line of [
      '1 ⅓ cups heavy cream',
      '2 medium shallots, finely chopped',
      '1 (28-ounce) can whole tomatoes',
      '400 g chicken thighs',
      '4 tablespoons unsalted butter',
      '1 bell pepper',
    ]) {
      expect(main(line), line).toBe(true)
    }
  })

  it('drops seasonings, spoonfuls, staples and anything without an amount', () => {
    for (const line of [
      'Salt',
      '1 teaspoon ground cumin',
      '2 tablespoons soy sauce',
      '1/4 cup olive oil',
      '1 cup water',
      '2 bay leaves',
      '1 teaspoon black pepper',
      '2 pepper',
      '1 pinch saffron',
      'fresh parsley, to serve',
    ]) {
      expect(main(line), line).toBe(false)
    }
  })
})

describe('shortName', () => {
  it('drops preparation notes and size notes', () => {
    expect(shortName('medium shallots, finely chopped')).toBe('medium shallots')
    expect(shortName('whole tomatoes (28-ounce)')).toBe('whole tomatoes')
    expect(shortName('rice')).toBe('rice')
  })
})

describe('toFraction', () => {
  it.each([
    [2, '2'],
    [0.5, '1/2'],
    [1.5, '1 1/2'],
    [1 + 1 / 3, '1 1/3'],
    [7 / 6, '1 1/6'],
    [2 / 3, '2/3'],
    [0.125, '1/8'],
    [2.75, '2 3/4'],
    [0.37, '37/100'],
    [2.9999999, '3'],
  ])('%d -> %s', (quantity, text) => {
    expect(toFraction(quantity)).toBe(text)
  })

  it('is null when no denominator up to 100 fits', () => {
    expect(toFraction(0.335)).toBeNull()
    expect(toFraction(Math.PI)).toBeNull()
  })
})

describe('formatQuantity', () => {
  it('prefers fractions and falls back to two decimals', () => {
    expect(formatQuantity(1.5)).toBe('1 1/2')
    expect(formatQuantity(Math.PI)).toBe('3.14')
  })

  it('shows decimals when asked', () => {
    expect(formatQuantity(1.5, 'decimals')).toBe('1.5')
    expect(formatQuantity(1 + 1 / 3, 'decimals')).toBe('1.33')
  })
})
