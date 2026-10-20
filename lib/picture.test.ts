import { afterEach, describe, expect, it, vi } from 'vitest'
import { canFetchPicture, fetchPicture, findPicture, fitWithin, MAX_SOURCE_BYTES, PictureError, readPicture, visibleCrop } from './picture'

describe('fitting a picture for upload', () => {
  it('keeps a picture that fits, and shrinks a wide photo or a long screenshot with its proportions', () => {
    expect(fitWithin(1170, 2532)).toEqual({ width: 1170, height: 2532 })
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(1290, 12000)).toEqual({ width: 430, height: 4000 })
  })
})

describe('which pictures the extension downloads itself', () => {
  it('web addresses and inline pictures, not the page’s own blob: pictures or browser pages', () => {
    expect(canFetchPicture('https://pbs.twimg.com/media/a.jpg')).toBe(true)
    expect(canFetchPicture('http://example.com/a.png')).toBe(true)
    expect(canFetchPicture('data:image/png;base64,iVBOR')).toBe(true)
    expect(canFetchPicture('data:text/html,<p>')).toBe(false)
    expect(canFetchPicture('blob:https://example.com/1234')).toBe(false)
    expect(canFetchPicture('chrome://favicon/x')).toBe(false)
    expect(canFetchPicture(undefined)).toBe(false)
  })
})

describe('downloading a picture', () => {
  it('reads it without the site’s cookies', async () => {
    const fetch = vi.fn(async () => new Response(new Blob(['jpeg']), { status: 200 }))
    expect((await fetchPicture('https://cdn.example.com/a.jpg', fetch))?.size).toBe(4)
    expect(fetch).toHaveBeenCalledWith('https://cdn.example.com/a.jpg', { credentials: 'omit' })
  })

  it('gives up (for the screen’s copy) on a refusal, a blocked request or a file far too large', async () => {
    expect(await fetchPicture('https://a/x.jpg', vi.fn(async () => new Response('', { status: 403 })))).toBeNull()
    expect(await fetchPicture('https://a/x.jpg', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))).toBeNull()
    const huge = new Response('x', { status: 200, headers: { 'Content-Length': String(MAX_SOURCE_BYTES + 1) } })
    expect(await fetchPicture('https://a/x.jpg', vi.fn(async () => huge))).toBeNull()
  })
})

describe('cutting the picture out of a capture of the tab', () => {
  const viewport = { width: 1000, height: 800 }

  it('scales its box to the capture’s pixels (screen density, zoom)', () => {
    expect(visibleCrop({ x: 100, y: 50, width: 300, height: 200 }, viewport, { width: 2000, height: 1600 })).toEqual({ x: 200, y: 100, width: 600, height: 400 })
  })

  it('keeps only the part on screen', () => {
    expect(visibleCrop({ x: -50, y: 700, width: 300, height: 300 }, viewport, { width: 1000, height: 800 })).toEqual({ x: 0, y: 700, width: 250, height: 100 })
  })

  it('finds nothing to cut when the picture is off screen', () => {
    expect(visibleCrop({ x: 0, y: 900, width: 300, height: 200 }, viewport, { width: 1000, height: 800 })).toBeNull()
    expect(visibleCrop({ x: 0, y: 0, width: 0, height: 0 }, viewport, { width: 1000, height: 800 })).toBeNull()
  })
})

describe('finding the right-clicked picture on the page', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function image(src: string, box: { left: number; top: number; width: number; height: number }) {
    const img = document.createElement('img')
    img.src = src
    img.getBoundingClientRect = () => ({ ...box, x: box.left, y: box.top, right: box.left + box.width, bottom: box.top + box.height, toJSON: () => ({}) }) as DOMRect
    document.body.append(img)
  }

  it('picks the largest visible copy of that address', () => {
    image('https://cdn.example.com/a.jpg', { left: 0, top: 0, width: 40, height: 40 })
    image('https://cdn.example.com/a.jpg', { left: 100, top: 100, width: 400, height: 300 })
    image('https://cdn.example.com/b.jpg', { left: 0, top: 0, width: 900, height: 700 })
    expect(findPicture('https://cdn.example.com/a.jpg')?.box).toEqual({ x: 100, y: 100, width: 400, height: 300 })
  })

  it('says when it isn’t there, or none of it shows', () => {
    image('https://cdn.example.com/a.jpg', { left: 0, top: 5000, width: 400, height: 300 })
    expect(findPicture('https://cdn.example.com/a.jpg')).toBeNull()
    expect(findPicture('https://cdn.example.com/missing.jpg')).toBeNull()
  })
})

describe('reading the right-clicked picture', () => {
  const jpeg = new Blob(['jpeg'], { type: 'image/jpeg' })
  const file = new Blob(['file'])
  const screen = { source: new Blob(['png']), crop: { x: 1, y: 2, width: 300, height: 200 } }

  it('uses its own file when the extension can download it, without capturing the tab', async () => {
    const capture = vi.fn(async () => screen)
    const shrink = vi.fn(async () => jpeg)
    expect(await readPicture('https://cdn.example.com/a.jpg', { fetch: async () => file, capture, shrink })).toBe(jpeg)
    expect(shrink).toHaveBeenCalledWith(file)
    expect(capture).not.toHaveBeenCalled()
  })

  it('cuts it out of the screen when it can’t be downloaded, or can’t be decoded', async () => {
    const shrink = vi.fn(async (source: unknown) => {
      if (source === file) throw new PictureError('unreadable')
      return jpeg
    })
    expect(await readPicture('https://cdn.example.com/a.jpg', { fetch: async () => null, capture: async () => screen, shrink })).toBe(jpeg)
    expect(shrink).toHaveBeenLastCalledWith(screen.source, screen.crop)
    expect(await readPicture('https://cdn.example.com/a.svg', { fetch: async () => file, capture: async () => screen, shrink })).toBe(jpeg)
    expect(shrink).toHaveBeenLastCalledWith(screen.source, screen.crop)
  })

  it('goes straight to the screen for a page’s blob: picture', async () => {
    const fetch = vi.fn(async () => file)
    await readPicture('blob:https://example.com/1', { fetch, capture: async () => screen, shrink: async () => jpeg })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('says it can’t read it when neither works', async () => {
    await expect(readPicture('https://cdn.example.com/a.jpg', { fetch: async () => null, capture: async () => null, shrink: async () => jpeg })).rejects.toMatchObject({ reason: 'unreadable' })
  })
})
