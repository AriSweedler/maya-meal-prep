import { describe, expect, it } from 'vitest'
import {
  formatIngredient,
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
    expect(line).toBe('1.5 cup flour')
    expect(parseIngredientLine(line)).toEqual({
      quantity: 1.5, unit: 'cup', name: 'flour',
    })
  })
})
