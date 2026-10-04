/** What a save came to, for the popup and the toolbar badge. */
export type SaveResult =
  | { kind: 'saved'; title: string | null }
  | { kind: 'duplicate'; title: string | null }
  /** The key is unknown or was removed in Settings → Devices: connect again. */
  | { kind: 'unauthorized' }
  /** A plan limit; `message` is the server's, in the browser's language. */
  | { kind: 'limit'; message: string }
  | { kind: 'error'; message: string | null }

interface ShareResponse {
  item?: { title?: string | null }
  duplicate?: boolean
  error?: { code?: string; message?: string }
}

/**
 * Saves a link through `POST /api/share` with the device key, like the phones do. The server checks the link and
 * the plan's limits; this only turns its answer into a SaveResult. A network failure is an error with no message.
 */
export async function saveLink({
  server,
  token,
  url,
  title,
  language,
  fetch = globalThis.fetch,
}: {
  server: string
  token: string
  url: string
  title?: string
  language: string
  fetch?: typeof globalThis.fetch
}): Promise<SaveResult> {
  let res: Response
  try {
    res = await fetch(`${server}/api/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Accept-Language': language },
      body: JSON.stringify(title ? { url, title: title.slice(0, 1000) } : { url }),
      // The key is the only credential: never the site's cookies.
      credentials: 'omit',
    })
  } catch {
    return { kind: 'error', message: null }
  }
  const body = (await res.json().catch(() => ({}))) as ShareResponse
  if (res.status === 201 || res.status === 200) {
    const savedTitle = body.item?.title ?? null
    return body.duplicate ? { kind: 'duplicate', title: savedTitle } : { kind: 'saved', title: savedTitle }
  }
  if (res.status === 401) return { kind: 'unauthorized' }
  const message = body.error?.message ?? null
  if (body.error?.code === 'limit_reached' && message) return { kind: 'limit', message }
  return { kind: 'error', message }
}
