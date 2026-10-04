import { browser } from 'wxt/browser'
import { SERVER } from './config'
import { clearConnection, getConnection } from './connection'
import { saveLink, type SaveResult } from './share'

/**
 * Saves a link to the connected account. Without a connection it says so; a key the server no longer knows
 * (removed in Settings → Devices) is forgotten, so the next click offers to connect again.
 */
export async function saveToAccount(url: string, title?: string): Promise<SaveResult | { kind: 'not-connected' }> {
  const connection = await getConnection(SERVER)
  if (!connection) return { kind: 'not-connected' }
  const result = await saveLink({ server: SERVER, token: connection.token, url, title, language: browser.i18n.getUILanguage() })
  if (result.kind === 'unauthorized') await clearConnection()
  return result
}
