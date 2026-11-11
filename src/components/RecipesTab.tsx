import { useEffect, useRef, useState } from 'react'
import type { RecipeAction } from './RecipesView'

type Props = {
  active: boolean
  /** Open the Recipes tab: null for the list, or straight into adding a recipe. */
  onOpen: (action: RecipeAction | null) => void
}

const HOLD_MS = 450

/**
 * The Recipes tab. A tap opens the recipe list; pressing and holding (or a
 * right-click) opens a menu of the ways to add a recipe.
 */
export function RecipesTab({ active, onOpen }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const anchor = useRef<HTMLDivElement>(null)
  const holdTimer = useRef<number | undefined>(undefined)
  // Set when a hold opened the menu, so the click that ends the press is ignored.
  const held = useRef(false)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!anchor.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const cancelHold = () => window.clearTimeout(holdTimer.current)

  function choose(action: RecipeAction) {
    setMenuOpen(false)
    onOpen(action)
  }

  return (
    <div className="tab-menu-anchor" ref={anchor}>
      <button
        type="button"
        className={active ? 'tab active' : 'tab'}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="Press and hold for ways to add a recipe"
        onPointerDown={() => {
          held.current = false
          holdTimer.current = window.setTimeout(() => {
            held.current = true
            setMenuOpen(true)
          }, HOLD_MS)
        }}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(event) => {
          event.preventDefault()
          cancelHold()
          setMenuOpen(true)
        }}
        onClick={() => {
          if (held.current) return
          setMenuOpen(false)
          onOpen(null)
        }}
      >
        Recipes
      </button>
      {menuOpen && (
        <div className="tab-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => choose('link')}>
            Add from a link
          </button>
          <button type="button" role="menuitem" onClick={() => choose('type')}>
            Type a recipe
          </button>
        </div>
      )}
    </div>
  )
}
