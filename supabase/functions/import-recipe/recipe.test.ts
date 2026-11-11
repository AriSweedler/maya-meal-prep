import { describe, expect, it } from 'vitest'
import {
  cleanText,
  parseDurationMinutes,
  parseServings,
  recipeFromHtml,
  recipeFromJsonLd,
  rejectUrl,
} from './recipe'

describe('parseDurationMinutes', () => {
  it.each([
    ['PT5M', 5],
    ['PT1H30M', 90],
    ['PT2H', 120],
    ['P1DT1H', 1500],
    ['PT25M0S', 25],
  ])('%s -> %d', (duration, minutes) => {
    expect(parseDurationMinutes(duration)).toBe(minutes)
  })

  it('is null when missing, zero or malformed', () => {
    expect(parseDurationMinutes(undefined)).toBeNull()
    expect(parseDurationMinutes('PT0M')).toBeNull()
    expect(parseDurationMinutes('30 minutes')).toBeNull()
  })
})

describe('parseServings', () => {
  it('reads the first number', () => {
    expect(parseServings('4 servings')).toBe(4)
    expect(parseServings(['6', '6 bowls'])).toBe(6)
    expect(parseServings(8)).toBe(8)
    expect(parseServings('Makes 2 1/2 cups')).toBe(2)
  })

  it('is null without a number', () => {
    expect(parseServings('a crowd')).toBeNull()
    expect(parseServings(undefined)).toBeNull()
  })
})

describe('cleanText', () => {
  it('strips tags, decodes entities and collapses spaces', () => {
    expect(cleanText('<p>Salt &amp;  pepper&#39;s</p>')).toBe("Salt & pepper's")
  })
})

const soup = {
  '@type': 'Recipe',
  name: 'Lentil Soup',
  recipeYield: '4 servings',
  prepTime: 'PT5M',
  cookTime: 'PT25M',
  totalTime: 'PT30M',
  recipeIngredient: ['1 cup lentils', ' Salt '],
  recipeInstructions: [
    { '@type': 'HowToStep', text: 'Boil the lentils.' },
    { '@type': 'HowToStep', text: 'Season.' },
  ],
}

describe('recipeFromJsonLd', () => {
  it('reads a recipe with times', () => {
    expect(recipeFromJsonLd(soup)).toEqual({
      title: 'Lentil Soup',
      servings: 4,
      ingredients: ['1 cup lentils', 'Salt'],
      instructions: '1. Boil the lentils.\n2. Season.',
      prepMinutes: 5,
      cookMinutes: 25,
      totalMinutes: 30,
      schemaOrg: soup,
    })
  })

  it('leaves times and servings null when the page omits them', () => {
    const { prepTime: _p, cookTime: _c, totalTime: _t, recipeYield: _y, ...bare } = soup
    expect(recipeFromJsonLd(bare)).toMatchObject({
      servings: null,
      prepMinutes: null,
      cookMinutes: null,
      totalMinutes: null,
    })
  })

  it('finds the recipe in a list, in @graph, and with several types', () => {
    expect(recipeFromJsonLd([{ '@type': 'WebPage' }, soup])?.title).toBe('Lentil Soup')
    expect(recipeFromJsonLd({ '@graph': [{ '@type': 'Person' }, soup] })?.title).toBe(
      'Lentil Soup',
    )
    expect(recipeFromJsonLd({ ...soup, '@type': ['Recipe', 'NewsArticle'] })?.title).toBe(
      'Lentil Soup',
    )
  })

  it('reads instructions given as text or as sections', () => {
    expect(recipeFromJsonLd({ ...soup, recipeInstructions: 'Boil.\nSeason.' })?.instructions).toBe(
      '1. Boil.\n2. Season.',
    )
    const sections = [
      { '@type': 'HowToSection', name: 'Soup', itemListElement: [{ text: 'Boil.' }] },
      { '@type': 'HowToSection', name: 'Finish', itemListElement: [{ text: 'Season.' }] },
    ]
    expect(recipeFromJsonLd({ ...soup, recipeInstructions: sections })?.instructions).toBe(
      '1. Boil.\n2. Season.',
    )
  })

  it('is null without a recipe, a title, or ingredients', () => {
    expect(recipeFromJsonLd({ '@type': 'Article', name: 'News' })).toBeNull()
    expect(recipeFromJsonLd({ ...soup, name: '' })).toBeNull()
    expect(recipeFromJsonLd({ ...soup, recipeIngredient: [] })).toBeNull()
  })
})

describe('recipeFromHtml', () => {
  const script = (json: string) => `<script type="application/ld+json">${json}</script>`

  it('skips broken and unrelated blocks', () => {
    const html = `<html>${script('{not json')}${script('{"@type":"Organization"}')}${script(
      JSON.stringify(soup),
    )}</html>`
    expect(recipeFromHtml(html)?.title).toBe('Lentil Soup')
  })

  it('is null for a page with no recipe', () => {
    expect(recipeFromHtml('<html><body>Hello</body></html>')).toBeNull()
  })
})

describe('rejectUrl', () => {
  it('allows public https pages', () => {
    expect(rejectUrl('https://cooking.example.com/recipes/1-soup')).toBeNull()
  })

  it('rejects everything else', () => {
    for (const url of [
      'not a link',
      'http://example.com/recipe',
      'https://localhost/recipe',
      'https://192.168.1.10/recipe',
      'https://[::1]/recipe',
      'https://printer.local/recipe',
      'https://intranet/recipe',
      'file:///etc/passwd',
    ]) {
      expect(rejectUrl(url), url).not.toBeNull()
    }
  })
})
