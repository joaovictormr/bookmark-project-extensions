import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { clearConnection, getConnection, setConnection } from './connection'

const connection = { token: 'stw_key', deviceId: 'dev-1', username: 'joao', server: 'https://stashmine.app' }

beforeEach(() => fakeBrowser.reset())

describe('connection', () => {
  it('keeps the key for its server', async () => {
    await setConnection(connection)
    expect(await getConnection('https://stashmine.app')).toEqual(connection)
  })
  it('doesn’t use a key made on another server', async () => {
    await setConnection({ ...connection, server: 'http://localhost:5173' })
    expect(await getConnection('https://stashmine.app')).toBeNull()
  })
  it('ignores something malformed in storage, and forgets on disconnect', async () => {
    await fakeBrowser.storage.local.set({ connection: { token: 1 } })
    expect(await getConnection('https://stashmine.app')).toBeNull()
    await setConnection(connection)
    await clearConnection()
    expect(await getConnection('https://stashmine.app')).toBeNull()
  })
})
