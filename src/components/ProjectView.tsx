import { useCallback, useEffect, useState } from 'react'
import {
  addEntry,
  createCollection,
  deleteEntry,
  deleteRecipe,
  listCollections,
  listEntries,
  listMembers,
  listRecipes,
  saveRecipe,
  subscribeToProject,
  updateEntryServings,
  type Collection,
  type Member,
  type PlanEntry,
  type Project,
  type Recipe,
} from '../lib/api'
import { addDays, startOfWeek, toISODate } from '../lib/dates'
import { GroceryView } from './GroceryView'
import { PlanView } from './PlanView'
import { RecipesView } from './RecipesView'

type Props = { project: Project; onLeave: () => void }

const TABS = ['Plan', 'Recipes', 'Groceries'] as const
type Tab = (typeof TABS)[number]

const RANGE_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

export function ProjectView({ project, onLeave }: Props) {
  const [tab, setTab] = useState<Tab>('Plan')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [collections, setCollections] = useState<Collection[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [entries, setEntries] = useState<PlanEntry[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)

  const weekEnd = addDays(weekStart, 6)
  const fromDate = toISODate(weekStart)
  const toDate = toISODate(weekEnd)

  const reload = useCallback(async () => {
    try {
      const [nextCollections, nextRecipes, nextEntries, nextMembers] = await Promise.all([
        listCollections(project.id),
        listRecipes(project.id),
        listEntries(project.id, fromDate, toDate),
        listMembers(project.id),
      ])
      setCollections(nextCollections)
      setRecipes(nextRecipes)
      setEntries(nextEntries)
      setMembers(nextMembers)
      setError(null)
    } catch (cause) {
      setError((cause as Error).message)
    }
  }, [project.id, fromDate, toDate])

  useEffect(() => {
    void reload()
    return subscribeToProject(project.id, () => void reload())
  }, [project.id, reload])

  /** Run a write, then reload so the screen shows what the database holds. */
  async function change(action: () => Promise<unknown>) {
    try {
      await action()
    } catch (cause) {
      setError((cause as Error).message)
    }
    await reload()
  }

  async function copyCode() {
    await navigator.clipboard.writeText(project.invite_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  return (
    <main>
      <header className="project-head">
        <div>
          <h1>{project.name}</h1>
          <p className="muted">
            {members.map((member) => member.email).join(', ')}
            {' · '}
            <button type="button" className="link" onClick={copyCode}>
              {codeCopied ? 'Invite code copied' : 'Copy invite code'}
            </button>
          </p>
        </div>
        <button type="button" onClick={onLeave}>All projects</button>
      </header>

      <nav className="tabs">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            className={name === tab ? 'tab active' : 'tab'}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>

      {error && <p className="notice">{error}</p>}

      {tab !== 'Recipes' && (
        <div className="toolbar week-nav">
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ← Previous
          </button>
          <strong>
            {RANGE_FORMAT.format(weekStart)} – {RANGE_FORMAT.format(weekEnd)}
          </strong>
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Next →
          </button>
          <button type="button" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            This week
          </button>
        </div>
      )}

      {tab === 'Plan' && (
        <PlanView
          weekStart={weekStart}
          entries={entries}
          recipes={recipes}
          collections={collections}
          onAdd={(date, slot, recipe) =>
            change(() =>
              addEntry({
                projectId: project.id,
                date,
                slot,
                recipeId: recipe.id,
                servings: recipe.servings,
              }),
            )
          }
          onServings={(entry, servings) => change(() => updateEntryServings(entry.id, servings))}
          onRemove={(entry) => change(() => deleteEntry(entry.id))}
        />
      )}

      {tab === 'Recipes' && (
        <RecipesView
          collections={collections}
          recipes={recipes}
          onSave={async (draft) => {
            await saveRecipe(project.id, draft)
            await reload()
          }}
          onDelete={(recipe) => change(() => deleteRecipe(recipe.id))}
          onAddCollection={(name) => change(() => createCollection(project.id, name))}
        />
      )}

      {tab === 'Groceries' && (
        <GroceryView listKey={`${project.id}:${fromDate}`} entries={entries} recipes={recipes} />
      )}
    </main>
  )
}
