import { useEffect, useState } from 'react'
import type { PlanEntry, Recipe } from '../lib/api'
import { copyText } from '../lib/clipboard'
import { buildGroceryList, type GroceryItem, type PlannedMeal } from '../lib/grocery'
import { formatQuantity } from '../lib/ingredients'

type Props = {
  /** Identifies this project and week, so ticks are remembered per list. */
  listKey: string
  entries: PlanEntry[]
  recipes: Recipe[]
}

function amount(item: GroceryItem): string {
  return [item.quantity === null ? null : formatQuantity(item.quantity), item.unit]
    .filter(Boolean)
    .join(' ')
}

export function GroceryView({ listKey, entries, recipes }: Props) {
  const storageKey = `grocery-ticks:${listKey}`
  const [ticked, setTicked] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  // Ticks stay on this device; they are not shared with other members yet.
  useEffect(() => {
    setTicked(JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[])
  }, [storageKey])

  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]))
  const meals: PlannedMeal[] = entries.flatMap((entry) => {
    const recipe = recipesById.get(entry.recipe_id)
    if (!recipe) return []
    return [
      {
        servings: entry.servings,
        recipe: {
          title: recipe.title,
          servings: recipe.servings,
          ingredients: recipe.recipe_ingredients,
        },
      },
    ]
  })
  const items = buildGroceryList(meals)

  function toggle(key: string) {
    const next = ticked.includes(key) ? ticked.filter((k) => k !== key) : [...ticked, key]
    setTicked(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  async function copy() {
    const text = items.map((item) => [amount(item), item.name].filter(Boolean).join(' ')).join('\n')
    setCopied(await copyText(text))
    setTimeout(() => setCopied(false), 2000)
  }

  if (items.length === 0) {
    return <p className="muted">Nothing planned this week, so there is nothing to buy.</p>
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <span className="muted">
          {items.length} items from {meals.length} planned meals
        </span>
        <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy list'}</button>
      </div>
      <ul className="plain card grocery">
        {items.map((item) => (
          <li key={item.key}>
            <label className={ticked.includes(item.key) ? 'check done' : 'check'}>
              <input
                type="checkbox"
                checked={ticked.includes(item.key)}
                onChange={() => toggle(item.key)}
              />
              <span className="amount">{amount(item)}</span>
              <span>{item.name}</span>
              <span className="muted for">{item.recipes.join(', ')}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
