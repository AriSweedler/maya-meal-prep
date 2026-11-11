import { SLOTS, type PlanEntry, type Recipe, type Slot } from '../lib/api'
import { toISODate, weekDays } from '../lib/dates'

type Props = {
  weekStart: Date
  entries: PlanEntry[]
  recipes: Recipe[]
  onAdd: (date: string, slot: Slot, recipe: Recipe) => void
  onServings: (entry: PlanEntry, servings: number) => void
  onRemove: (entry: PlanEntry) => void
}

const DAY_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

export function PlanView({ weekStart, entries, recipes, onAdd, onServings, onRemove }: Props) {
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]))
  const today = toISODate(new Date())

  if (recipes.length === 0) {
    return <p className="muted">Add a recipe first, then plan it into the week.</p>
  }

  return (
    <div className="week">
      {weekDays(weekStart).map((day) => {
        const date = toISODate(day)
        return (
          <section key={date} className={date === today ? 'day today' : 'day'}>
            <h3>{DAY_FORMAT.format(day)}</h3>
            {SLOTS.map((slot) => (
              <div key={slot} className="slot">
                <h4>{slot}</h4>
                {entries
                  .filter((entry) => entry.plan_date === date && entry.slot === slot)
                  .map((entry) => (
                    <div key={entry.id} className="meal">
                      <span className="meal-title">
                        {recipesById.get(entry.recipe_id)?.title ?? 'Unknown recipe'}
                      </span>
                      <label className="servings">
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          aria-label="Portions"
                          defaultValue={entry.servings}
                          key={entry.servings}
                          onBlur={(event) => {
                            const servings = Number(event.target.value)
                            if (servings > 0 && servings !== entry.servings) {
                              onServings(entry, servings)
                            }
                          }}
                        />
                        portions
                      </label>
                      <button
                        type="button"
                        className="icon"
                        aria-label="Remove meal"
                        onClick={() => onRemove(entry)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                <select
                  className="add-meal"
                  aria-label={`Add ${slot} on ${DAY_FORMAT.format(day)}`}
                  value=""
                  onChange={(event) => {
                    const recipe = recipesById.get(event.target.value)
                    if (recipe) onAdd(date, slot, recipe)
                  }}
                >
                  <option value="">+ Add</option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.title}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
