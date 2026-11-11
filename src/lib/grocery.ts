import { normalizeUnit, type IngredientInput } from './ingredients'

export type PlannedMeal = {
  /** Portions planned for this meal. */
  servings: number
  recipe: {
    title: string
    /** Portions the recipe's ingredient quantities make. */
    servings: number
    ingredients: IngredientInput[]
  }
}

export type GroceryItem = {
  key: string
  name: string
  unit: string | null
  /** Null when no planned meal gives a quantity for it ("salt"). */
  quantity: number | null
  recipes: string[]
}

/**
 * Combine the ingredients of every planned meal into one shopping list.
 * Each ingredient is scaled by planned servings / recipe servings, and
 * ingredients with the same name and unit are summed. Units are not
 * converted: "1 cup milk" and "200 ml milk" stay separate lines.
 */
export function buildGroceryList(meals: PlannedMeal[]): GroceryItem[] {
  const items = new Map<string, GroceryItem>()

  for (const meal of meals) {
    const scale = meal.servings / meal.recipe.servings
    for (const ingredient of meal.recipe.ingredients) {
      const name = ingredient.name.trim().replace(/\s+/g, ' ')
      const unit = normalizeUnit(ingredient.unit)
      const key = `${name.toLowerCase()}|${unit ?? ''}`

      const item = items.get(key) ?? { key, name, unit, quantity: null, recipes: [] }
      if (ingredient.quantity !== null) {
        item.quantity = (item.quantity ?? 0) + ingredient.quantity * scale
      }
      if (!item.recipes.includes(meal.recipe.title)) {
        item.recipes.push(meal.recipe.title)
      }
      items.set(key, item)
    }
  }

  return [...items.values()].sort((a, b) => a.name.localeCompare(b.name))
}
