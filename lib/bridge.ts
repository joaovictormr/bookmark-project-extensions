/**
 * The messages between the content script and the web app's `#/connect-extension` page, over `window.postMessage`
 * on the same window. The page's side is the main repo's `apps/web/src/lib/extensionBridge.ts`, which this mirrors.
 */

export const EXTENSION_SOURCE = 'stashmine-extension'
export const WEB_SOURCE = 'stashmine-web'
/** Bumped on both sides whenever a message changes. */
export const PROTOCOL = 1

export type BrowserName = 'chrome' | 'edge' | 'firefox' | 'safari' | 'other'

export type ExtensionMessage =
  | { source: typeof EXTENSION_SOURCE; type: 'hello'; protocol: typeof PROTOCOL; browser: BrowserName; deviceId: string | null }
  | { source: typeof EXTENSION_SOURCE; type: 'connected'; deviceId: string }

export type PageMessage =
  | { type: 'ping' }
  | { type: 'connect'; token: string; deviceId: string; username: string; server: string }

const TOKEN_RE = /^stw_[A-Za-z0-9_-]{43}$/
const USERNAME_RE = /^[a-z0-9_]{3,20}$/

/** A message from the page in this window, from our server, in the expected shape; null for anything else. */
export function readPageMessage(
  event: { data: unknown; origin: string; source: unknown },
  self: { origin: string; window: unknown; server: string },
): PageMessage | null {
  // Our own page only: not another site's iframe, not an extension-less page on another origin.
  if (event.source !== self.window || event.origin !== self.origin || self.origin !== self.server) return null
  const data = event.data as Record<string, unknown> | null
  if (!data || typeof data !== 'object' || data.source !== WEB_SOURCE) return null
  if (data.type === 'ping') return { type: 'ping' }
  if (data.type !== 'connect') return null
  const { token, deviceId, username, server } = data
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null
  if (typeof deviceId !== 'string' || deviceId.length === 0 || deviceId.length > 64) return null
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) return null
  // A key made on another server would save there.
  if (server !== self.server) return null
  return { type: 'connect', token, deviceId, username, server }
}

/** The browser's name for the device label ("Chrome on Mac"). Edge, Brave and Opera run the Chrome build. */
export function browserName(build: string, userAgent: string): BrowserName {
  if (build === 'firefox') return 'firefox'
  if (build === 'safari') return 'safari'
  if (/\bEdg\//.test(userAgent)) return 'edge'
  if (build === 'chrome' || build === 'edge') return 'chrome'
  return 'other'
}
