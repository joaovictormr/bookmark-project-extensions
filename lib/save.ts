import { browser } from 'wxt/browser'
import { SERVER } from './config'
import { clearConnection, getConnection, type Connection } from './connection'
import { saveLink, savePicture, type SaveResult } from './share'

type AccountResult = SaveResult | { kind: 'not-connected' }

/**
 * Saves with the connected account's key. Without a connection it says so; a key the server no longer knows
 * (removed in Settings → Devices) is forgotten, so the next click offers to connect again.
 */
async function withConnection(save: (connection: Connection, language: string) => Promise<SaveResult>): Promise<AccountResult> {
  const connection = await getConnection(SERVER)
  if (!connection) return { kind: 'not-connected' }
  const result = await save(connection, browser.i18n.getUILanguage())
  if (result.kind === 'unauthorized') await clearConnection()
  return result
}

/** Saves a link to the connected account. */
export function saveToAccount(url: string, title?: string): Promise<AccountResult> {
  return withConnection((connection, language) => saveLink({ server: SERVER, token: connection.token, url, title, language }))
}

/** Saves a picture (a JPEG from lib/picture.ts) to the connected account, as an image save. */
export function savePictureToAccount(picture: Blob): Promise<AccountResult> {
  return withConnection((connection, language) => savePicture({ server: SERVER, token: connection.token, picture, language }))
}

/** Whether a key is stored for this build's server (checked before reading a picture nobody could save). */
export async function isConnected(): Promise<boolean> {
  return (await getConnection(SERVER)) !== null
}
