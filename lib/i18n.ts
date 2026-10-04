import { browser } from 'wxt/browser'

/** A text from `public/_locales/<language>/messages.json`, in the browser's language (English otherwise). */
export function t(key: string, ...substitutions: string[]): string {
  return browser.i18n.getMessage(key as never, substitutions) || key
}
