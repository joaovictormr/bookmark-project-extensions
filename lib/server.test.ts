import { describe, expect, it } from 'vitest'
import { matchPatternFor, serverFor } from './server'

describe('serverFor', () => {
  it('uses the local web app in development and stashmine.app otherwise', () => {
    expect(serverFor('development')).toBe('http://localhost:5173')
    expect(serverFor('production')).toBe('https://stashmine.app')
  })
  it('takes an override, keeping only its origin', () => {
    expect(serverFor('production', 'https://abc.trycloudflare.com/some/path')).toBe('https://abc.trycloudflare.com')
  })
})

describe('matchPatternFor', () => {
  it('leaves the port out, which match patterns can’t hold', () => {
    expect(matchPatternFor('https://stashmine.app')).toBe('https://stashmine.app/*')
    expect(matchPatternFor('http://localhost:5173')).toBe('http://localhost/*')
  })
})
