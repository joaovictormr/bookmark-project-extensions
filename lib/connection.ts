import { browser } from 'wxt/browser'

/** The account this browser saves to: a device key from the connect page, kept only in this extension's storage. */
export interface Connection {
  token: string
  deviceId: string
  username: string
  /** The server the key was made on. */
  server: string
}

const KEY = 'connection'

function isConnection(value: unknown): value is Connection {
  const c = value as Record<string, unknown> | null
  return Boolean(c) && ['token', 'deviceId', 'username', 'server'].every((k) => typeof c![k] === 'string')
}

/** The connection for `server`, or null; one made on another server (a development build's) doesn't count. */
export async function getConnection(server: string): Promise<Connection | null> {
  const stored = (await browser.storage.local.get(KEY))[KEY]
  return isConnection(stored) && stored.server === server ? stored : null
}

export async function setConnection(connection: Connection): Promise<void> {
  await browser.storage.local.set({ [KEY]: connection })
}

/** Forgets the key here. It stays in the web app's Settings → Devices until removed there. */
export async function clearConnection(): Promise<void> {
  await browser.storage.local.remove(KEY)
}
