import { describe, expect, it } from 'vitest'
import { classifyLink, extractUrl } from './links'

describe('extractUrl', () => {
  const url = 'https://cooking.nytimes.com/recipes/1025225-lentil-tomato-soup'

  it('returns a bare link', () => {
    expect(extractUrl(url)).toBe(url)
    expect(extractUrl(`  ${url}\n`)).toBe(url)
  })

  it('finds the link inside shared text', () => {
    expect(extractUrl(`Lentil Tomato Soup Recipe (${url})`)).toBe(url)
    expect(extractUrl(`Try this: ${url}.`)).toBe(url)
    expect(extractUrl(`<${url}>`)).toBe(url)
  })

  it('keeps query strings and takes the first of several links', () => {
    expect(extractUrl(`${url}?smid=share&x=1 and https://example.com`)).toBe(
      `${url}?smid=share&x=1`,
    )
  })

  it('is null when there is no link', () => {
    expect(extractUrl('Lentil Tomato Soup Recipe')).toBeNull()
    expect(extractUrl('')).toBeNull()
  })
})

describe('classifyLink', () => {
  it('recognises NYT Cooking recipes', () => {
    expect(
      classifyLink('https://cooking.nytimes.com/recipes/1025225-lentil-tomato-soup'),
    ).toMatchObject({ id: 'nyt-cooking', supported: true })
  })

  it('recognises Instagram posts and reels, not profiles', () => {
    expect(classifyLink('https://www.instagram.com/p/Cabc123/')?.id).toBe('instagram')
    expect(classifyLink('https://instagram.com/reel/Cabc123/?igsh=x')?.id).toBe('instagram')
    expect(classifyLink('https://www.instagram.com/somecook/')).toBeNull()
  })

  it('has no class for ordinary pages, look-alike hosts and invalid links', () => {
    expect(classifyLink('https://www.seriouseats.com/lentil-soup')).toBeNull()
    expect(classifyLink('https://www.nytimes.com/2026/11/11/dining/soup.html')).toBeNull()
    expect(classifyLink('https://notinstagram.com/p/abc/')).toBeNull()
    expect(classifyLink('not a link')).toBeNull()
  })
})
