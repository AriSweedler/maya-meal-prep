import {
  formatQuantity,
  fractionParts,
  type IngredientInput,
} from '../lib/ingredients'
import { getQuantityStyle } from '../lib/preferences'

/**
 * An amount, with its fraction set like LaTeX's \frac: the numerator over
 * the denominator with a bar between. Screen readers and copied text get the
 * plain "1 1/6".
 */
export function Quantity({ value }: { value: number }) {
  const parts = getQuantityStyle() === 'fractions' ? fractionParts(value) : null
  if (!parts || parts.numerator === 0) return <>{formatQuantity(value)}</>

  return (
    <span className="quantity">
      <span className="sr-only">{formatQuantity(value)}</span>
      <span aria-hidden="true">
        {parts.whole > 0 && parts.whole}
        <span className="frac">
          <span>{parts.numerator}</span>
          <span>{parts.denominator}</span>
        </span>
      </span>
    </span>
  )
}

/** One ingredient as "amount unit name", with the amount typeset. */
export function IngredientLine({ ingredient }: { ingredient: IngredientInput }) {
  return (
    <>
      {ingredient.quantity !== null && (
        <>
          <Quantity value={ingredient.quantity} />{' '}
        </>
      )}
      {ingredient.unit && `${ingredient.unit} `}
      {ingredient.name}
    </>
  )
}
