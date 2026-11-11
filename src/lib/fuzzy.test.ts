import { describe, expect, it } from 'vitest'
import { fuzzyFilter, fuzzyScore } from './fuzzy'

const titles = ['Steak and cabbage', 'Chicken tacos', 'Tacos al pastor', 'Lentil soup']
const search = (query: string) => fuzzyFilter(titles, query, (title) => title)

describe('fuzzyScore', () => {
  it('matches characters in order, ignoring case and spaces', () => {
    expect(fuzzyScore('chk tco', 'Chicken tacos')).not.toBeNull()
    expect(fuzzyScore('TACO', 'Chicken tacos')).not.toBeNull()
  })

  it('rejects characters that are missing or out of order', () => {
    expect(fuzzyScore('tacoz', 'Chicken tacos')).toBeNull()
    expect(fuzzyScore('socat', 'Tacos')).toBeNull()
  })
})

describe('fuzzyFilter', () => {
  it('returns everything, alphabetically, for an empty query', () => {
    expect(search('')).toEqual([...titles].sort())
  })

  it('ranks word starts and consecutive runs first', () => {
    expect(search('tac')).toEqual(['Tacos al pastor', 'Chicken tacos', 'Steak and cabbage'])
  })

  it('drops items that do not match', () => {
    expect(search('lentil')).toEqual(['Lentil soup'])
    expect(search('pizza')).toEqual([])
  })
})
