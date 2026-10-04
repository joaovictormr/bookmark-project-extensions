/**
 * Whether a tab's address can be saved: web pages only, not the browser's own pages (chrome://, about:), local
 * files and the like, which the API would refuse anyway. On pages where the browser gives extensions no access
 * (the extension stores), `activeTab` leaves the address out, so it's undefined here.
 */
export function isSavable(url: string | undefined): url is string {
  if (!url) return false
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
