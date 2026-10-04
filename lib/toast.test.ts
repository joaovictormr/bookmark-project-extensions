import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showToast } from './toast'

const host = () => document.getElementById('stashmine-extension-toast')

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  host()?.remove()
})

describe('showToast', () => {
  it('shows one message at a time and removes itself', () => {
    showToast('Saved', 'ok', 'A page', 3500)
    showToast('Already in your saves', 'ok', null, 3500)
    expect(document.querySelectorAll('#stashmine-extension-toast')).toHaveLength(1)
    vi.advanceTimersByTime(3500)
    expect(host()).toBeNull()
  })
})
