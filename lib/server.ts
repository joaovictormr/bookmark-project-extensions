/** The web app the extension saves to and connects with: `/api/share` and `/#/connect-extension` live there. */
export const PRODUCTION_SERVER = 'https://stashmine.app'
/** `pnpm dev` in the main repo: the web app's Vite server, which passes `/api` on to the API. */
export const DEVELOPMENT_SERVER = 'http://localhost:5173'

/** `WXT_SERVER_URL` overrides it (a tunnel, a staging server); only its origin is kept. */
export function serverFor(mode: string, override?: string): string {
  return new URL(override || (mode === 'development' ? DEVELOPMENT_SERVER : PRODUCTION_SERVER)).origin
}

/** A match pattern for an origin. Patterns can't hold a port, so a local server's matches any port on that host. */
export function matchPatternFor(origin: string): string {
  const url = new URL(origin)
  return `${url.protocol}//${url.hostname}/*`
}
