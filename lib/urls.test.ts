import { describe, expect, it } from 'vitest'
import { isSavable } from './urls'

describe('isSavable', () => {
  it('accepts web pages', () => {
    expect(isSavable('https://www.youtube.com/watch?v=abc')).toBe(true)
    expect(isSavable('http://example.com/')).toBe(true)
  })
  it('refuses the browser’s own pages, files and missing addresses', () => {
    for (const url of ['chrome://extensions', 'about:blank', 'edge://settings', 'moz-extension://x/popup.html', 'file:///Users/me/a.pdf', 'view-source:https://a.com', 'not a url', '', undefined]) {
      expect(isSavable(url)).toBe(false)
    }
  })
})
