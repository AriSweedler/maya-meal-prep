import { useState, type FormEvent } from 'react'
import type { Collection, Recipe, RecipeDraft } from '../lib/api'
import { formatIngredient, parseIngredientLines } from '../lib/ingredients'

type Props = {
  collections: Collection[]
  recipes: Recipe[]
  onSave: (draft: RecipeDraft) => Promise<void>
  onDelete: (recipe: Recipe) => Promise<void>
  onAddCollection: (name: string) => Promise<void>
}

type FormState = {
  id: string | null
  collectionId: string
  title: string
  servings: string
  sourceUrl: string
  ingredientText: string
  instructions: string
}

function blankForm(collectionId: string): FormState {
  return {
    id: null,
    collectionId,
    title: '',
    servings: '4',
    sourceUrl: '',
    ingredientText: '',
    instructions: '',
  }
}

function formFor(recipe: Recipe): FormState {
  return {
    id: recipe.id,
    collectionId: recipe.collection_id,
    title: recipe.title,
    servings: String(recipe.servings),
    sourceUrl: recipe.source_url ?? '',
    ingredientText: recipe.recipe_ingredients.map(formatIngredient).join('\n'),
    instructions: recipe.instructions,
  }
}

export function RecipesView({ collections, recipes, onSave, onDelete, onAddCollection }: Props) {
  const [form, setForm] = useState<FormState | null>(null)
  const [filter, setFilter] = useState('all')

  const shown = recipes.filter((recipe) => filter === 'all' || recipe.collection_id === filter)

  async function addCollection() {
    const name = window.prompt('Name the new collection')?.trim()
    if (name) await onAddCollection(name)
  }

  if (form) {
    return (
      <RecipeForm
        form={form}
        collections={collections}
        onChange={setForm}
        onCancel={() => setForm(null)}
        onSubmit={async (draft) => {
          await onSave(draft)
          setForm(null)
        }}
      />
    )
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <select
          aria-label="Collection"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">All collections</option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={addCollection}>New collection</button>
        <button
          type="button"
          className="primary"
          disabled={collections.length === 0}
          onClick={() =>
            setForm(blankForm(filter === 'all' ? (collections[0]?.id ?? '') : filter))
          }
        >
          New recipe
        </button>
      </div>
      {shown.length === 0 && <p className="muted">No recipes here yet.</p>}
      <ul className="plain stack">
        {shown.map((recipe) => (
          <li key={recipe.id} className="card">
            <div className="recipe-head">
              <div>
                <strong>{recipe.title}</strong>
                <span className="muted">
                  {' '}
                  · makes {recipe.servings} portions · {recipe.recipe_ingredients.length}{' '}
                  ingredients
                </span>
              </div>
              <div className="toolbar">
                <button type="button" onClick={() => setForm(formFor(recipe))}>Edit</button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete "${recipe.title}"? It also leaves the meal plan.`)) {
                      void onDelete(recipe)
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

type FormProps = {
  form: FormState
  collections: Collection[]
  onChange: (form: FormState) => void
  onCancel: () => void
  onSubmit: (draft: RecipeDraft) => Promise<void>
}

function RecipeForm({ form, collections, onChange, onCancel, onSubmit }: FormProps) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ingredients = parseIngredientLines(form.ingredientText)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        id: form.id,
        collectionId: form.collectionId,
        title: form.title,
        servings: Number(form.servings),
        instructions: form.instructions,
        sourceUrl: form.sourceUrl,
        ingredients,
      })
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2>{form.id ? 'Edit recipe' : 'New recipe'}</h2>
      <label>
        Title
        <input
          required
          value={form.title}
          onChange={(event) => onChange({ ...form, title: event.target.value })}
        />
      </label>
      <div className="fields">
        <label>
          Collection
          <select
            value={form.collectionId}
            onChange={(event) => onChange({ ...form, collectionId: event.target.value })}
          >
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Makes (portions)
          <input
            type="number"
            required
            min="0.5"
            step="0.5"
            value={form.servings}
            onChange={(event) => onChange({ ...form, servings: event.target.value })}
          />
        </label>
      </div>
      <label>
        Ingredients, one per line
        <textarea
          rows={8}
          placeholder={'1 1/2 cups rice\n2 cloves garlic\n400 g chicken thighs\nsalt'}
          value={form.ingredientText}
          onChange={(event) => onChange({ ...form, ingredientText: event.target.value })}
        />
      </label>
      {ingredients.length > 0 && (
        <table className="parsed">
          <caption>How the grocery list will read them</caption>
          <thead>
            <tr>
              <th>Amount</th>
              <th>Unit</th>
              <th>Ingredient</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ingredient, index) => (
              <tr key={index}>
                <td>{ingredient.quantity ?? '—'}</td>
                <td>{ingredient.unit ?? '—'}</td>
                <td>{ingredient.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <label>
        Instructions
        <textarea
          rows={6}
          value={form.instructions}
          onChange={(event) => onChange({ ...form, instructions: event.target.value })}
        />
      </label>
      <label>
        Source link (optional)
        <input
          type="url"
          value={form.sourceUrl}
          onChange={(event) => onChange({ ...form, sourceUrl: event.target.value })}
        />
      </label>
      {error && <p className="notice">{error}</p>}
      <div className="toolbar">
        <button type="submit" className="primary" disabled={busy}>Save recipe</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
