import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { readShortcut, storedShortcut, storeShortcut, titleWithShortcut } from './shortcut'

beforeEach(() => {
  fakeBrowser.reset()
  vi.restoreAllMocks()
})

describe('the save shortcut', () => {
  it('reads the keys of the popup’s command', async () => {
    vi.spyOn(fakeBrowser.commands, 'getAll').mockResolvedValue([
      { name: 'other', shortcut: 'Ctrl+K' },
      { name: '_execute_action', shortcut: 'Alt+Shift+S' },
    ] as never)
    expect(await readShortcut()).toBe('Alt+Shift+S')
  })

  it('is null when the person removed it, or the browser can’t say', async () => {
    vi.spyOn(fakeBrowser.commands, 'getAll').mockResolvedValueOnce([{ name: '_execute_action', shortcut: '' }] as never)
    expect(await readShortcut()).toBeNull()
    vi.spyOn(fakeBrowser.commands, 'getAll').mockRejectedValueOnce(new Error('not supported'))
    expect(await readShortcut()).toBeNull()
  })

  it('goes in the toolbar button’s tooltip when there is one', () => {
    expect(titleWithShortcut('Save to StashMine', 'Alt+Shift+S')).toBe('Save to StashMine (Alt+Shift+S)')
    expect(titleWithShortcut('Save to StashMine', null)).toBe('Save to StashMine')
  })

  it('is kept for the connect page, ignoring anything odd in storage', async () => {
    expect(await storedShortcut()).toBeNull()
    await storeShortcut('⌥⇧S')
    expect(await storedShortcut()).toBe('⌥⇧S')
    await storeShortcut(null)
    expect(await storedShortcut()).toBeNull()
    await fakeBrowser.storage.local.set({ shortcut: { keys: 'x' } })
    expect(await storedShortcut()).toBeNull()
  })
})
