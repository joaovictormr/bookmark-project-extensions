export type ToastKind = 'ok' | 'error'

export const TOAST_MS = 3500

/**
 * A small "Saved" message in the corner of the page, for saves from the right-click menu (the popup says it
 * itself). Injected with `scripting.executeScript`, so it must stand alone: no imports, nothing from outside but
 * its arguments. A shadow root keeps the page's styles out; a second save replaces the first message.
 */
export function showToast(message: string, kind: ToastKind, detail: string | null, durationMs: number): void {
  const ID = 'stashmine-extension-toast'
  document.getElementById(ID)?.remove()
  const host = document.createElement('div')
  host.id = ID
  host.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; right: 16px; bottom: 16px;'
  const root = host.attachShadow({ mode: 'closed' })
  const box = document.createElement('div')
  box.setAttribute('role', 'status')
  box.style.cssText = [
    'display: flex; gap: 10px; align-items: flex-start; max-width: 320px; padding: 12px 14px;',
    'border-radius: 14px; background: #1d1c1a; color: #f5f3ef; box-shadow: 0 8px 24px rgba(0,0,0,.25);',
    "font: 14px/1.4 Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;",
    'opacity: 0; transform: translateY(8px); transition: opacity .2s, transform .2s;',
  ].join('')
  const icon = document.createElement('span')
  icon.textContent = kind === 'ok' ? '✓' : '!'
  icon.style.cssText = `flex: none; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; font-weight: 700; font-size: 12px; color: #fff; background: ${kind === 'ok' ? '#2f8f5b' : '#c2410c'};`
  const text = document.createElement('div')
  const strong = document.createElement('div')
  strong.textContent = message
  strong.style.fontWeight = '600'
  text.append(strong)
  if (detail) {
    const small = document.createElement('div')
    small.textContent = detail
    small.style.cssText = 'color: #b3aea5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;'
    text.append(small)
  }
  box.append(icon, text)
  root.append(box)
  document.documentElement.append(host)
  requestAnimationFrame(() => {
    box.style.opacity = '1'
    box.style.transform = 'none'
  })
  setTimeout(() => host.remove(), durationMs)
}
