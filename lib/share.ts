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
  return send(fetch, `${server}/api/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Accept-Language': language },
    body: JSON.stringify(title ? { url, title: title.slice(0, 1000) } : { url }),
    // The key is the only credential: never the site's cookies.
    credentials: 'omit',
  })
}

/**
 * Saves a picture (a JPEG from lib/picture.ts) through `POST /api/share/image`, a multipart form with one `file`, an
 * image save. The server checks the plan (Pro and Team) and the picture; its answers read like `/api/share`'s.
 */
export async function savePicture({
  server,
  token,
  picture,
  language,
  fetch = globalThis.fetch,
}: {
  server: string
  token: string
  picture: Blob
  language: string
  fetch?: typeof globalThis.fetch
}): Promise<SaveResult> {
  const form = new FormData()
  form.append('file', new File([picture], 'picture.jpg', { type: 'image/jpeg' }))
  // No Content-Type: fetch writes the form's own, with its boundary.
  return send(fetch, `${server}/api/share/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Accept-Language': language },
    body: form,
    credentials: 'omit',
  })
}

/** Sends a save and turns the server's answer into a SaveResult. A network failure is an error with no message. */
async function send(fetch: typeof globalThis.fetch, url: string, init: RequestInit): Promise<SaveResult> {
  let res: Response
  try {
    res = await fetch(url, init)
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
