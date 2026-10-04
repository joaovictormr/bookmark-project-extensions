import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { getConnection, setConnection } from './connection'
import { SERVER } from './config'
import { saveToAccount } from './save'

beforeEach(() => {
  fakeBrowser.reset()
  vi.restoreAllMocks()
  vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('en-US')
})

describe('saveToAccount', () => {
  it('asks to connect when there is no key', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    expect(await saveToAccount('https://example.com')).toEqual({ kind: 'not-connected' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('forgets a key the server no longer knows', async () => {
    await setConnection({ token: 'stw_key', deviceId: 'd', username: 'joao', server: SERVER })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }))
    expect(await saveToAccount('https://example.com')).toEqual({ kind: 'unauthorized' })
    expect(await getConnection(SERVER)).toBeNull()
  })

  it('keeps the key after other errors', async () => {
    await setConnection({ token: 'stw_key', deviceId: 'd', username: 'joao', server: SERVER })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'rate_limited', message: 'Slow down' } }), { status: 429 }))
    expect(await saveToAccount('https://example.com')).toEqual({ kind: 'error', message: 'Slow down' })
    expect(await getConnection(SERVER)).not.toBeNull()
  })
})
