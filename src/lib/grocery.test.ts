import { describe, expect, it } from 'vitest'
import { buildGroceryList, type PlannedMeal } from './grocery'

const chili: PlannedMeal['recipe'] = {
  title: 'Chili',
  servings: 4,
  ingredients: [
    { name: 'Ground beef', quantity: 1, unit: 'lb' },
    { name: 'Onion', quantity: 1, unit: null },
    { name: 'Salt', quantity: null, unit: null },
  ],
}

const tacos: PlannedMeal['recipe'] = {
  title: 'Tacos',
  servings: 2,
  ingredients: [
    { name: 'ground beef', quantity: 0.5, unit: 'pounds' },
    { name: 'Onion', quantity: 100, unit: 'g' },
    { name: 'Tortillas', quantity: 6, unit: null },
  ],
}

function find(list: ReturnType<typeof buildGroceryList>, key: string) {
  return list.find((item) => item.key === key)
}

describe('buildGroceryList', () => {
  it('scales by planned servings over recipe servings', () => {
    const list = buildGroceryList([{ servings: 6, recipe: chili }])
    expect(find(list, 'ground beef|lb')?.quantity).toBeCloseTo(1.5)
    expect(find(list, 'onion|')?.quantity).toBeCloseTo(1.5)
  })

  it('sums the same ingredient across meals, ignoring case and unit spelling', () => {
    const list = buildGroceryList([
      { servings: 4, recipe: chili },
      { servings: 4, recipe: tacos },
    ])
    const beef = find(list, 'ground beef|lb')
    expect(beef?.quantity).toBeCloseTo(2)
    expect(beef?.recipes).toEqual(['Chili', 'Tacos'])
  })

  it('keeps different units as separate lines', () => {
    const list = buildGroceryList([
      { servings: 4, recipe: chili },
      { servings: 2, recipe: tacos },
    ])
    expect(find(list, 'onion|')?.quantity).toBe(1)
    expect(find(list, 'onion|g')?.quantity).toBe(100)
  })

  it('lists an ingredient with no quantity once, without an amount', () => {
    const list = buildGroceryList([
      { servings: 4, recipe: chili },
      { servings: 8, recipe: chili },
    ])
    expect(find(list, 'salt|')?.quantity).toBeNull()
    expect(list.filter((item) => item.name === 'Salt')).toHaveLength(1)
  })

  it('returns nothing for an empty plan, and sorts by name', () => {
    expect(buildGroceryList([])).toEqual([])
    const names = buildGroceryList([{ servings: 4, recipe: chili }]).map((i) => i.name)
    expect(names).toEqual(['Ground beef', 'Onion', 'Salt'])
  })
})
