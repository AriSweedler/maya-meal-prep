import { describe, expect, it } from 'vitest'
import { buildSchemaOrgRecipe, ingredientLinesOf, minutesToDuration } from './schemaOrg'

const fields = {
  title: ' Lentil Soup ',
  servings: 4,
  ingredientLines: ['1 ⅓ cups heavy cream', '', ' Salt '],
  instructions: '1. Boil the lentils.\n\n2) Season.\nServe',
  prepMinutes: 5,
  cookMinutes: 90,
  totalMinutes: null,
  sourceUrl: '',
}

describe('minutesToDuration', () => {
  it.each([
    [5, 'PT5M'],
    [60, 'PT1H'],
    [90, 'PT1H30M'],
    [0, 'PT0M'],
  ])('%d -> %s', (minutes, duration) => {
    expect(minutesToDuration(minutes)).toBe(duration)
  })
})

describe('buildSchemaOrgRecipe', () => {
  it('writes a typed recipe as a schema.org Recipe', () => {
    expect(buildSchemaOrgRecipe(null, fields)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: 'Lentil Soup',
      recipeYield: '4 servings',
      recipeIngredient: ['1 ⅓ cups heavy cream', 'Salt'],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'Boil the lentils.' },
        { '@type': 'HowToStep', text: 'Season.' },
        { '@type': 'HowToStep', text: 'Serve' },
      ],
      prepTime: 'PT5M',
      cookTime: 'PT1H30M',
    })
  })

  it('keeps what an imported document holds and the app does not edit', () => {
    const imported = {
      '@context': 'https://schema.org',
      '@type': ['Recipe', 'NewsArticle'],
      name: 'Old name',
      author: { '@type': 'Person', name: 'A Cook' },
      image: 'https://example.com/soup.jpg',
      totalTime: 'PT30M',
      url: 'https://example.com/soup',
    }
    const built = buildSchemaOrgRecipe(imported, { ...fields, sourceUrl: imported.url })
    expect(built).toMatchObject({
      '@type': ['Recipe', 'NewsArticle'],
      name: 'Lentil Soup',
      author: imported.author,
      image: imported.image,
      url: imported.url,
    })
    // The form cleared the total time, so the document drops it.
    expect(built).not.toHaveProperty('totalTime')
    expect(imported.name).toBe('Old name')
  })
})

describe('ingredientLinesOf', () => {
  it('reads the lines of a stored document', () => {
    expect(ingredientLinesOf({ recipeIngredient: ['1 cup rice', 'Salt'] })).toEqual([
      '1 cup rice',
      'Salt',
    ])
  })

  it('is null without usable lines', () => {
    expect(ingredientLinesOf(null)).toBeNull()
    expect(ingredientLinesOf({ recipeIngredient: [] })).toBeNull()
    expect(ingredientLinesOf({ recipeIngredient: [{ name: 'rice' }] })).toBeNull()
  })
})
