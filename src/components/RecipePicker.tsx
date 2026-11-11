import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Collection, Recipe } from '../lib/api'
import { fuzzyFilter } from '../lib/fuzzy'

type Props = {
  /** What the pick is for, shown as the heading: "Dinner, Wed, Nov 11". */
  title: string
  recipes: Recipe[]
  collections: Collection[]
  onPick: (recipe: Recipe) => void
  onClose: () => void
}

/** A modal fuzzy finder: type a few letters, arrow to a recipe, press Enter. */
export function RecipePicker({ title, recipes, collections, onPick, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const collectionNames = new Map(collections.map((c) => [c.id, c.name]))
  const matches = fuzzyFilter(recipes, query, (recipe) => recipe.title)

  useEffect(() => {
    dialog.current?.showModal()
    // showModal focuses the first control, the close button; typing should search.
    search.current?.focus()
  }, [])

  useEffect(() => {
    list.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(Math.min(active + 1, matches.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(Math.max(active - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (matches[active]) onPick(matches[active])
    }
  }

  return (
    <dialog
      ref={dialog}
      className="picker"
      aria-label={`Choose a recipe for ${title}`}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === dialog.current) onClose()
      }}
    >
      <div className="picker-body">
        <div className="picker-head">
          <strong>{title}</strong>
          <button type="button" className="icon" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <input
          ref={search}
          type="search"
          placeholder="Search recipes"
          aria-label="Search recipes"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
        />
        <ul ref={list} className="plain picker-list" role="listbox">
          {matches.map((recipe, index) => (
            <li key={recipe.id} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={index === active ? 'picker-item active' : 'picker-item'}
                onMouseEnter={() => setActive(index)}
                onClick={() => onPick(recipe)}
              >
                <span>{recipe.title}</span>
                <span className="muted">
                  {collectionNames.get(recipe.collection_id)} · makes {recipe.servings}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {matches.length === 0 && <p className="muted">No recipe matches “{query}”.</p>}
      </div>
    </dialog>
  )
}
