// Per-browser display preferences. There is no settings screen yet; the
// values live in localStorage so one can be added without changing callers.

export type QuantityStyle = 'fractions' | 'decimals'

const QUANTITY_STYLE_KEY = 'quantity-style'

/** How amounts are shown: "1 1/2" (the default) or "1.5". */
export function getQuantityStyle(): QuantityStyle {
  try {
    return localStorage.getItem(QUANTITY_STYLE_KEY) === 'decimals' ? 'decimals' : 'fractions'
  } catch {
    // No storage (tests, private modes): use the default.
    return 'fractions'
  }
}

export function setQuantityStyle(style: QuantityStyle): void {
  localStorage.setItem(QUANTITY_STYLE_KEY, style)
}
