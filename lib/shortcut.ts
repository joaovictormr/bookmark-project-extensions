import { browser } from 'wxt/browser'

/** Where the background keeps the shortcut it last read, for the content script (which can't read commands). */
const KEY = 'shortcut'

/**
 * The keys that open the popup and save the page (`_execute_action`), as the browser shows them ("Alt+Shift+S",
 * "⌥⇧S"); null when there are none (the person removed them, or the browser has no commands API).
 */
export async function readShortcut(): Promise<string | null> {
  try {
    const commands = await browser.commands.getAll()
    return commands.find((c) => c.name === '_execute_action')?.shortcut || null
  } catch {
    return null
  }
}

/** The toolbar button's tooltip, with the shortcut when there is one: "Save to StashMine (Alt+Shift+S)". */
export function titleWithShortcut(title: string, shortcut: string | null): string {
  return shortcut ? `${title} (${shortcut})` : title
}

/** Remembers the shortcut for the connect page's "connected" message (entrypoints/connect.content.ts). */
export async function storeShortcut(shortcut: string | null): Promise<void> {
  await browser.storage.local.set({ [KEY]: shortcut })
}

/** The shortcut the background last read; null when it has none or never read it. */
export async function storedShortcut(): Promise<string | null> {
  const value = (await browser.storage.local.get(KEY))[KEY]
  return typeof value === 'string' && value.length > 0 && value.length <= 40 ? value : null
}
