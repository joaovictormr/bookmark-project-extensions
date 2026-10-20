/**
 * Right-click a picture → "Save picture to StashMine": an image save (Pro and Team; the main repo's CLAUDE.md →
 * Image saves), sent to `POST /api/share/image` like the iPhone share extension does. The picture is shrunk here the
 * way the web app does it (../apps/web/src/lib/imageUpload.ts), since the server takes a JPEG and nothing else.
 */
export const MAX_WIDTH = 1600
export const MAX_HEIGHT = 4000
/** What the API takes at most (the main repo's apps/api/src/lib/image-file.ts → MAX_UPLOAD_BYTES). */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024
/** A picture bigger than this isn't even read. */
export const MAX_SOURCE_BYTES = 40 * 1024 * 1024
/** JPEG qualities tried in turn until the picture fits MAX_UPLOAD_BYTES. */
const QUALITIES = [0.85, 0.72, 0.6]

/** `unreadable`: not a picture this browser can decode, or nowhere to be found; `too-large`: over 3 MB even shrunk. */
export class PictureError extends Error {
  constructor(readonly reason: 'unreadable' | 'too-large') {
    super(reason)
  }
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** The size a picture is drawn at: within maxWidth × maxHeight, never larger than it is, its proportions kept. */
export function fitWithin(width: number, height: number, maxWidth = MAX_WIDTH, maxHeight = MAX_HEIGHT): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Whether the extension may download a right-clicked picture's address itself: web addresses and inline pictures. */
export function canFetchPicture(url: string | undefined): url is string {
  if (!url) return false
  if (/^data:image\//i.test(url)) return true
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * The picture's bytes, or null when they can't be had: many picture servers don't let an extension read them (no
 * CORS header for it; `activeTab` covers the page's own address only), and a picture over MAX_SOURCE_BYTES isn't
 * read. Then readPicture crops it out of the visible tab instead. Never the site's cookies.
 */
export async function fetchPicture(url: string, fetch: typeof globalThis.fetch = globalThis.fetch): Promise<Blob | null> {
  try {
    const res = await fetch(url, { credentials: 'omit' })
    if (!res.ok || Number(res.headers.get('Content-Length') ?? 0) > MAX_SOURCE_BYTES) return null
    const blob = await res.blob()
    return blob.size > MAX_SOURCE_BYTES ? null : blob
  } catch {
    return null
  }
}

/** A capture of the visible tab and where the picture is in it (the background's captureVisibleTab and findPicture). */
export interface Capture {
  source: ImageBitmapSource
  crop: Rect
}

/**
 * The right-clicked picture as a JPEG to send. Its own file first (full size, even the part off screen); when the
 * extension can't download or decode it, what shows of it on screen, cut out of a capture of the tab. The capture
 * never leaves the browser: only the crop is sent.
 */
export async function readPicture(
  src: string | undefined,
  {
    fetch = fetchPicture,
    capture,
    shrink = shrinkPicture,
  }: { fetch?: (url: string) => Promise<Blob | null>; capture: () => Promise<Capture | null>; shrink?: (source: ImageBitmapSource, crop?: Rect) => Promise<Blob> },
): Promise<Blob> {
  const file = canFetchPicture(src) ? await fetch(src) : null
  if (file) {
    try {
      return await shrink(file)
    } catch {
      // A format this browser can't decode here (an SVG in a service worker), or too large even shrunk: the screen's copy.
    }
  }
  const shot = await capture()
  if (!shot) throw new PictureError('unreadable')
  return shrink(shot.source, shot.crop)
}

/**
 * Where to cut the picture out of a capture of the visible tab: its box on the page (CSS pixels, from findPicture),
 * cut to what's on screen, scaled to the capture's pixels (the screen's density and the page's zoom). Null when none
 * of it is on screen.
 */
export function visibleCrop(box: Rect, viewport: { width: number; height: number }, capture: { width: number; height: number }): Rect | null {
  const left = Math.max(0, box.x)
  const top = Math.max(0, box.y)
  const right = Math.min(viewport.width, box.x + box.width)
  const bottom = Math.min(viewport.height, box.y + box.height)
  if (right - left < 1 || bottom - top < 1 || viewport.width <= 0) return null
  const scale = capture.width / viewport.width
  const x = Math.round(left * scale)
  const y = Math.round(top * scale)
  return {
    x,
    y,
    width: Math.min(capture.width - x, Math.round((right - left) * scale)),
    height: Math.min(capture.height - y, Math.round((bottom - top) * scale)),
  }
}

/**
 * Runs in the page (`scripting.executeScript`), so it must stand alone: no imports, nothing from outside but its
 * argument. The right-clicked picture's box on screen and the viewport's size, or null when it isn't in this page.
 * The menu doesn't say which element was clicked, only its address: the largest visible picture with that address.
 */
export function findPicture(src: string): { box: Rect; viewport: { width: number; height: number } } | null {
  const viewport = { width: window.innerWidth, height: window.innerHeight }
  let best: Rect | null = null
  let bestArea = 0
  for (const img of Array.from(document.querySelectorAll('img'))) {
    if (img.currentSrc !== src && img.src !== src) continue
    const r = img.getBoundingClientRect()
    const visible = Math.max(0, Math.min(r.right, viewport.width) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, viewport.height) - Math.max(r.top, 0))
    if (visible > bestArea) {
      bestArea = visible
      best = { x: r.left, y: r.top, width: r.width, height: r.height }
    }
  }
  return best ? { box: best, viewport } : null
}

/**
 * The picture ready to send: `crop` of it (a capture of the tab) or all of it, shrunk to fit, on white (JPEG has no
 * transparency), a JPEG under MAX_UPLOAD_BYTES. Works in the background's service worker (OffscreenCanvas).
 */
export async function shrinkPicture(source: ImageBitmapSource, crop?: Rect): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = crop ? await createImageBitmap(source, crop.x, crop.y, crop.width, crop.height) : await createImageBitmap(source)
  } catch {
    throw new PictureError('unreadable')
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height)
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new PictureError('unreadable')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    for (const quality of QUALITIES) {
      const jpeg = await canvas.convertToBlob({ type: 'image/jpeg', quality })
      if (jpeg.size <= MAX_UPLOAD_BYTES) return jpeg
    }
    throw new PictureError('too-large')
  } finally {
    bitmap.close()
  }
}
