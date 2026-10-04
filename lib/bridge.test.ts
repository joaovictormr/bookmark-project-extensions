import { describe, expect, it } from 'vitest'
import { browserName, readPageMessage, WEB_SOURCE } from './bridge'

const server = 'https://stashmine.app'
const self = { origin: server, window: {}, server }
const token = `stw_${'a'.repeat(43)}`
const connect = { source: WEB_SOURCE, type: 'connect', token, deviceId: 'dev-1', username: 'joao', server }
const from = (data: unknown, overrides: Partial<{ origin: string; source: unknown }> = {}) => ({ data, origin: server, source: self.window, ...overrides })

describe('readPageMessage', () => {
  it('reads the page’s ping and connect', () => {
    expect(readPageMessage(from({ source: WEB_SOURCE, type: 'ping' }), self)).toEqual({ type: 'ping' })
    expect(readPageMessage(from(connect), self)).toEqual({ type: 'connect', token, deviceId: 'dev-1', username: 'joao', server })
  })

  it('ignores messages from another window, another origin, or a page that isn’t our server', () => {
    expect(readPageMessage(from(connect, { source: {} }), self)).toBeNull()
    expect(readPageMessage(from(connect, { origin: 'https://evil.example' }), self)).toBeNull()
    expect(readPageMessage(from(connect, { origin: 'https://evil.example' }), { ...self, origin: 'https://evil.example' })).toBeNull()
  })

  it('reads a sign-out’s disconnect, with a well-formed device only', () => {
    expect(readPageMessage(from({ source: WEB_SOURCE, type: 'disconnect', deviceId: 'dev-1' }), self)).toEqual({ type: 'disconnect', deviceId: 'dev-1' })
    expect(readPageMessage(from({ source: WEB_SOURCE, type: 'disconnect', deviceId: '' }), self)).toBeNull()
    expect(readPageMessage(from({ source: WEB_SOURCE, type: 'disconnect' }), self)).toBeNull()
    expect(readPageMessage(from({ source: WEB_SOURCE, type: 'disconnect', deviceId: 'dev-1' }, { origin: 'https://evil.example' }), self)).toBeNull()
  })

  it('refuses a key for another server', () => {
    expect(readPageMessage(from({ ...connect, server: 'https://evil.example' }), self)).toBeNull()
  })

  it('refuses malformed keys, devices and usernames, and its own messages', () => {
    expect(readPageMessage(from({ ...connect, token: 'stw_short' }), self)).toBeNull()
    expect(readPageMessage(from({ ...connect, token: 42 }), self)).toBeNull()
    expect(readPageMessage(from({ ...connect, deviceId: '' }), self)).toBeNull()
    expect(readPageMessage(from({ ...connect, username: 'Not Valid!' }), self)).toBeNull()
    expect(readPageMessage(from({ source: 'stashmine-extension', type: 'hello' }), self)).toBeNull()
    expect(readPageMessage(from(null), self)).toBeNull()
  })
})

describe('browserName', () => {
  it('tells the Chromium browsers apart by the user agent', () => {
    expect(browserName('chrome', 'Mozilla/5.0 (Macintosh) Chrome/130 Safari/537.36')).toBe('chrome')
    expect(browserName('chrome', 'Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537.36 Edg/130')).toBe('edge')
    expect(browserName('firefox', 'Mozilla/5.0 Firefox/131.0')).toBe('firefox')
    expect(browserName('safari', 'Mozilla/5.0 Safari/605')).toBe('safari')
    expect(browserName('opera', 'Mozilla/5.0')).toBe('other')
  })
})
