import { describe, expect, it, vi } from 'vitest'
import { saveLink } from './share'

function respond(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}
const base = { server: 'https://stashmine.app', token: 'stw_key', url: 'https://example.com/a', language: 'pt-BR' }

describe('saveLink', () => {
  it('posts the link and title with the key, without cookies, in the browser’s language', async () => {
    const fetch = respond(201, { item: { title: 'A page' }, duplicate: false })
    expect(await saveLink({ ...base, title: 'A page', fetch })).toEqual({ kind: 'saved', title: 'A page' })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://stashmine.app/api/share')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('omit')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer stw_key', 'Accept-Language': 'pt-BR' })
    expect(JSON.parse(init.body as string)).toEqual({ url: 'https://example.com/a', title: 'A page' })
  })

  it('sends no title when there is none, and cuts a long one to the API’s limit', async () => {
    const fetch = respond(201, { item: {} })
    await saveLink({ ...base, fetch })
    expect(JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ url: base.url })
    await saveLink({ ...base, title: 'x'.repeat(2000), fetch })
    expect(JSON.parse((fetch.mock.calls[1] as unknown as [string, RequestInit])[1].body as string).title).toHaveLength(1000)
  })

  it('tells an existing save apart', async () => {
    expect(await saveLink({ ...base, fetch: respond(200, { item: { title: 'Old' }, duplicate: true }) })).toEqual({ kind: 'duplicate', title: 'Old' })
  })

  it('reports a removed key as unauthorized', async () => {
    expect(await saveLink({ ...base, fetch: respond(401, { error: { code: 'unauthorized', message: 'x' } }) })).toEqual({ kind: 'unauthorized' })
  })

  it('passes on a plan limit with the server’s words', async () => {
    const fetch = respond(403, { error: { code: 'limit_reached', message: 'You’ve saved 20 links.' }, upgrade: 'account' })
    expect(await saveLink({ ...base, fetch })).toEqual({ kind: 'limit', message: 'You’ve saved 20 links.' })
  })

  it('passes on other errors, and a network failure without a message', async () => {
    expect(await saveLink({ ...base, fetch: respond(400, { error: { code: 'invalid_url', message: 'Bad link' } }) })).toEqual({ kind: 'error', message: 'Bad link' })
    expect(await saveLink({ ...base, fetch: vi.fn(async () => new Response('<html>', { status: 502 })) })).toEqual({ kind: 'error', message: null })
    expect(await saveLink({ ...base, fetch: vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))) })).toEqual({ kind: 'error', message: null })
  })
})
