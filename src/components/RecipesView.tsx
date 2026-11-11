import { useState, type FormEvent } from 'react'
import {
  ImportError,
  importRecipe,
  recordImportFailure,
  type Collection,
  type ImportedRecipe,
  type Recipe,
  type RecipeDraft,
} from '../lib/api'
import {
  formatIngredient,
  isMainIngredient,
  parseIngredientLines,
  shortName,
} from '../lib/ingredients'
import { classifyLink, extractUrl } from '../lib/links'
import { IngredientLine, Quantity } from './Quantity'
import { buildSchemaOrgRecipe, ingredientLinesOf, type SchemaOrgRecipe } from '../lib/schemaOrg'

type Props = {
  projectId: string
  collections: Collection[]
  recipes: Recipe[]
  onSave: (draft: RecipeDraft) => Promise<void>
  onDelete: (recipe: Recipe) => Promise<void>
  onAddCollection: (name: string) => Promise<void>
  /** Open straight into typing a recipe or importing one, from the tab's menu. */
  startWith?: RecipeAction | null
}

export type RecipeAction = 'type' | 'link'

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
  /** The schema.org document the recipe already has; the save builds on it. */
  schemaOrg: SchemaOrgRecipe | null
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
    schemaOrg: null,
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
    // The stored document has each line as it was written ("1 ⅓ cups"), which the
    // parsed columns cannot give back.
    ingredientText: (
      ingredientLinesOf(recipe.schema_org) ?? recipe.recipe_ingredients.map(formatIngredient)
    ).join('\n'),
    instructions: recipe.instructions,
    schemaOrg: recipe.schema_org as SchemaOrgRecipe,
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
    schemaOrg: imported.schemaOrg,
  }
}

function draftFrom(form: FormState): RecipeDraft {
  const fields = {
    title: form.title,
    servings: Number(form.servings),
    instructions: form.instructions,
    sourceUrl: form.sourceUrl,
    prepMinutes: minutesValue(form.prepMinutes),
    cookMinutes: minutesValue(form.cookMinutes),
    totalMinutes: minutesValue(form.totalMinutes),
  }
  return {
    ...fields,
    id: form.id,
    collectionId: form.collectionId,
    sourceType: form.sourceType,
    ingredients: parseIngredientLines(form.ingredientText),
    schemaOrg: buildSchemaOrgRecipe(form.schemaOrg, {
      ...fields,
      ingredientLines: form.ingredientText.split('\n'),
    }),
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

export function RecipesView({
  projectId,
  collections,
  recipes,
  onSave,
  onDelete,
  onAddCollection,
  startWith = null,
}: Props) {
  const [filter, setFilter] = useState('all')
  const targetCollection = filter === 'all' ? (collections[0]?.id ?? '') : filter
  const [form, setForm] = useState<FormState | null>(
    startWith === 'type' && targetCollection ? blankForm(targetCollection) : null,
  )
  const [importing, setImporting] = useState(startWith === 'link')
  // An imported recipe waiting for the user to confirm it.
  const [review, setReview] = useState<FormState | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const shown = recipes.filter((recipe) => filter === 'all' || recipe.collection_id === filter)

  async function addCollection() {
    const name = window.prompt('Name the new collection')?.trim()
    if (name) await onAddCollection(name)
  }

  if (review) {
    return (
      <ImportReview
        form={review}
        onEdit={() => {
          setForm(review)
          setReview(null)
        }}
        onCancel={() => setReview(null)}
        onSave={async () => {
          await onSave(draftFrom(review))
          setSaved(review.title)
          setReview(null)
        }}
      />
    )
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
          From a link
        </button>
        <button
          type="button"
          className="primary"
          disabled={collections.length === 0}
          onClick={() => setForm(blankForm(targetCollection))}
        >
          Type a recipe
        </button>
      </div>
      {importing && (
        <ImportForm
          projectId={projectId}
          onCancel={() => setImporting(false)}
          onImported={(imported) => {
            setImporting(false)
            setSaved(null)
            setReview(formForImport(imported, targetCollection))
          }}
        />
      )}
      {saved && (
        <p className="success" role="status">
          “{saved}” was added to your recipes.
        </p>
      )}
      {shown.length === 0 && <p className="muted">No recipes here yet.</p>}
      <ul className="plain stack">
        {shown.map((recipe) => (
          <li key={recipe.id} className="card">
            <RecipeCard
              recipe={recipe}
              onEdit={() => setForm(formFor(recipe))}
              onDelete={() => void onDelete(recipe)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

type CardProps = {
  recipe: Recipe
  onEdit: () => void
  onDelete: () => void
}

/**
 * One recipe in the list. A tap opens a short summary, the main ingredients
 * on a line; "Full recipe" then shows every ingredient and the steps.
 */
function RecipeCard({ recipe, onEdit, onDelete }: CardProps) {
  const [full, setFull] = useState(false)
  const mains = recipe.recipe_ingredients.filter(isMainIngredient)
  // A recipe of only seasonings still gets a summary: its first few ingredients.
  const summary = (mains.length > 0 ? mains : recipe.recipe_ingredients.slice(0, 5)).map(
    (ingredient) => shortName(ingredient.name),
  )

  return (
    <details className="recipe">
      <summary>
        <strong>{recipe.title}</strong>
        <span className="muted">
          {[`makes ${recipe.servings}`, ...timings(recipe)].join(' · ')}
        </span>
      </summary>
      <div className="recipe-body stack">
        {full ? (
          <>
            <ul>
              {recipe.recipe_ingredients.map((ingredient) => (
                <li key={ingredient.id}>
                  <IngredientLine ingredient={ingredient} />
                </li>
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
          </>
        ) : (
          <p className="mains">{summary.join(' · ')}</p>
        )}
        <div className="toolbar">
          <button type="button" onClick={() => setFull(!full)}>
            {full ? 'Main ingredients' : 'Full recipe'}
          </button>
          <button type="button" onClick={onEdit}>Edit</button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete "${recipe.title}"? It also leaves the meal plan.`)) {
                onDelete()
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </details>
  )
}

type ReviewProps = {
  form: FormState
  onSave: () => Promise<void>
  onEdit: () => void
  onCancel: () => void
}

/** Shown after a successful import: what was found, before anything is saved. */
function ImportReview({ form, onSave, onEdit, onCancel }: ReviewProps) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ingredients = parseIngredientLines(form.ingredientText)
  const steps = form.instructions.split('\n').filter(Boolean)
  const facts = [
    `Makes ${form.servings}`,
    form.prepMinutes && `Prep ${formatMinutes(Number(form.prepMinutes))}`,
    form.cookMinutes && `Cook ${formatMinutes(Number(form.cookMinutes))}`,
    form.totalMinutes && `Total ${formatMinutes(Number(form.totalMinutes))}`,
  ].filter(Boolean)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await onSave()
    } catch (cause) {
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  return (
    <section className="card stack review">
      <p className="success">Found it on {hostOf(form.sourceUrl)}</p>
      <h2>{form.title}</h2>
      <ul className="plain facts">
        {facts.map((fact) => (
          <li key={fact as string}>{fact}</li>
        ))}
      </ul>
      <div>
        <h4>{ingredients.length} ingredients</h4>
        <ul>
          {ingredients.map((ingredient, index) => (
            <li key={index}>
              <IngredientLine ingredient={ingredient} />
            </li>
          ))}
        </ul>
      </div>
      {steps.length > 0 && (
        <div>
          <h4>{steps.length} steps</h4>
          <p className="instructions">{form.instructions}</p>
        </div>
      )}
      {error && <p className="notice">{error}</p>}
      <div className="toolbar">
        <button type="button" className="primary" disabled={busy} onClick={save}>
          Save recipe
        </button>
        <button type="button" onClick={onEdit}>Edit first</button>
        <button type="button" onClick={onCancel}>Discard</button>
      </div>
    </section>
  )
}

type ImportProps = {
  projectId: string
  onImported: (recipe: ImportedRecipe) => void
  onCancel: () => void
}

function ImportForm({ projectId, onImported, onCancel }: ImportProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const link = extractUrl(text)
  const linkClass = link ? classifyLink(link) : null
  // Text with no link in it can never import; say so as soon as it is typed.
  const invalid = text.trim() !== '' && !link
  const unsupported = linkClass !== null && !linkClass.supported

  async function run(input: string) {
    const url = extractUrl(input)
    if (url && classifyLink(url)?.supported === false) return
    if (!url) return
    setBusy(true)
    setError(null)
    try {
      onImported(await importRecipe(url))
    } catch (cause) {
      const message = (cause as Error).message
      const status = cause instanceof ImportError ? cause.status : null
      setError(message)
      setBusy(false)
      void recordImportFailure({ projectId, input, url, error: message, status })
    }
  }

  return (
    <form
      className="card stack"
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        void run(text)
      }}
    >
      <label>
        Paste a recipe link, or shared text with a link in it
        <input
          required
          autoFocus
          placeholder="Lentil Tomato Soup Recipe (https://cooking.nytimes.com/recipes/…)"
          className={invalid ? 'invalid' : undefined}
          aria-invalid={invalid}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setError(null)
          }}
          onPaste={(event) => {
            // A paste that holds a link starts the import without another tap.
            // A paste without one is a failed attempt worth keeping for debugging.
            const pasted = event.clipboardData.getData('text')
            if (extractUrl(pasted)) {
              event.preventDefault()
              setText(pasted)
              void run(pasted)
            } else if (pasted.trim() !== '') {
              void recordImportFailure({
                projectId,
                input: pasted,
                url: null,
                error: 'There is no link in that text.',
                status: null,
              })
            }
          }}
        />
      </label>
      {invalid && !error && <p className="error">That is not a link.</p>}
      {linkClass && (
        <p className={unsupported ? 'link-class unsupported' : 'link-class'}>
          <span className="badge">{linkClass.label}</span>
          {unsupported && ' Importing these is not ready yet.'}
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <div className="toolbar">
        <button type="submit" className="primary" disabled={busy || invalid || unsupported}>
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
      await onSubmit(draftFrom(form))
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
                <td>
                  {ingredient.quantity === null ? '—' : <Quantity value={ingredient.quantity} />}
                </td>
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
