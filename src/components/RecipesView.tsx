import { useState, type FormEvent } from 'react'
import {
  importRecipe,
  type Collection,
  type ImportedRecipe,
  type Recipe,
  type RecipeDraft,
} from '../lib/api'
import { formatIngredient, formatQuantity, parseIngredientLines } from '../lib/ingredients'

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
  prepMinutes: string
  cookMinutes: string
  totalMinutes: string
  sourceUrl: string
  sourceType: string
  ingredientText: string
  instructions: string
}

function blankForm(collectionId: string): FormState {
  return {
    id: null,
    collectionId,
    title: '',
    servings: '4',
    prepMinutes: '',
    cookMinutes: '',
    totalMinutes: '',
    sourceUrl: '',
    sourceType: 'manual',
    ingredientText: '',
    instructions: '',
  }
}

const minutesText = (minutes: number | null) => (minutes === null ? '' : String(minutes))
const minutesValue = (text: string) => (text.trim() === '' ? null : Number(text))

function formFor(recipe: Recipe): FormState {
  return {
    id: recipe.id,
    collectionId: recipe.collection_id,
    title: recipe.title,
    servings: String(recipe.servings),
    prepMinutes: minutesText(recipe.prep_minutes),
    cookMinutes: minutesText(recipe.cook_minutes),
    totalMinutes: minutesText(recipe.total_minutes),
    sourceUrl: recipe.source_url ?? '',
    sourceType: recipe.source_type,
    ingredientText: recipe.recipe_ingredients.map(formatIngredient).join('\n'),
    instructions: recipe.instructions,
  }
}

function formForImport(imported: ImportedRecipe, collectionId: string): FormState {
  return {
    ...blankForm(collectionId),
    title: imported.title,
    servings: String(imported.servings ?? 4),
    prepMinutes: minutesText(imported.prepMinutes),
    cookMinutes: minutesText(imported.cookMinutes),
    totalMinutes: minutesText(imported.totalMinutes),
    sourceUrl: imported.sourceUrl,
    sourceType: 'web',
    ingredientText: imported.ingredients.join('\n'),
    instructions: imported.instructions,
  }
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

/** The timings a recipe has, and nothing for the ones it lacks. */
function timings(recipe: Recipe): string[] {
  return [
    recipe.prep_minutes !== null && `prep ${formatMinutes(recipe.prep_minutes)}`,
    recipe.cook_minutes !== null && `cook ${formatMinutes(recipe.cook_minutes)}`,
    recipe.total_minutes !== null && `total ${formatMinutes(recipe.total_minutes)}`,
  ].filter((part) => part !== false)
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function RecipesView({ collections, recipes, onSave, onDelete, onAddCollection }: Props) {
  const [form, setForm] = useState<FormState | null>(null)
  const [filter, setFilter] = useState('all')
  const [importing, setImporting] = useState(false)

  const shown = recipes.filter((recipe) => filter === 'all' || recipe.collection_id === filter)
  const targetCollection = filter === 'all' ? (collections[0]?.id ?? '') : filter

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
          disabled={collections.length === 0}
          onClick={() => setImporting(!importing)}
        >
          Import from link
        </button>
        <button
          type="button"
          className="primary"
          disabled={collections.length === 0}
          onClick={() => setForm(blankForm(targetCollection))}
        >
          New recipe
        </button>
      </div>
      {importing && (
        <ImportForm
          onCancel={() => setImporting(false)}
          onImported={(imported) => {
            setImporting(false)
            setForm(formForImport(imported, targetCollection))
          }}
        />
      )}
      {shown.length === 0 && <p className="muted">No recipes here yet.</p>}
      <ul className="plain stack">
        {shown.map((recipe) => (
          <li key={recipe.id} className="card">
            <details className="recipe">
              <summary>
                <strong>{recipe.title}</strong>
                <span className="muted">
                  {[`makes ${recipe.servings}`, ...timings(recipe)].join(' · ')}
                </span>
              </summary>
              <div className="recipe-body stack">
                <ul>
                  {recipe.recipe_ingredients.map((ingredient) => (
                    <li key={ingredient.id}>{formatIngredient(ingredient)}</li>
                  ))}
                </ul>
                {recipe.instructions && <p className="instructions">{recipe.instructions}</p>}
                {recipe.source_url && (
                  <p className="muted">
                    From{' '}
                    <a href={recipe.source_url} target="_blank" rel="noreferrer">
                      {hostOf(recipe.source_url)}
                    </a>
                  </p>
                )}
                <div className="toolbar">
                  <button type="button" onClick={() => setForm(formFor(recipe))}>Edit</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(`Delete "${recipe.title}"? It also leaves the meal plan.`)
                      ) {
                        void onDelete(recipe)
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  )
}

type ImportProps = {
  onImported: (recipe: ImportedRecipe) => void
  onCancel: () => void
}

function ImportForm({ onImported, onCancel }: ImportProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onImported(await importRecipe(url.trim()))
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <label>
        Link to a recipe page
        <input
          type="url"
          required
          autoFocus
          placeholder="https://cooking.nytimes.com/recipes/…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      {error && <p className="notice">{error}</p>}
      <div className="toolbar">
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Reading the page…' : 'Import'}
        </button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
      <p className="muted small">You can check and edit everything before it is saved.</p>
    </form>
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
  const newHeading = form.sourceType === 'web' ? 'Imported recipe' : 'New recipe'
  const heading = form.id ? 'Edit recipe' : newHeading

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
        sourceType: form.sourceType,
        prepMinutes: minutesValue(form.prepMinutes),
        cookMinutes: minutesValue(form.cookMinutes),
        totalMinutes: minutesValue(form.totalMinutes),
        ingredients,
      })
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  const minutesField = (label: string, key: 'prepMinutes' | 'cookMinutes' | 'totalMinutes') => (
    <label>
      {label}
      <input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={form[key]}
        onChange={(event) => onChange({ ...form, [key]: event.target.value })}
      />
    </label>
  )

  return (
    <form className="card stack" onSubmit={submit}>
      <h2>{heading}</h2>
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
      <fieldset className="times">
        <legend>Time in minutes (optional)</legend>
        {minutesField('Prep', 'prepMinutes')}
        {minutesField('Cook', 'cookMinutes')}
        {minutesField('Total', 'totalMinutes')}
      </fieldset>
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
                <td>{ingredient.quantity === null ? '—' : formatQuantity(ingredient.quantity)}</td>
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
