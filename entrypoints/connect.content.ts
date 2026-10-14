import { defineContentScript } from 'wxt/utils/define-content-script'
import { browserName, EXTENSION_SOURCE, PROTOCOL, readPageMessage, type ExtensionMessage } from '../lib/bridge'
import { SERVER } from '../lib/config'
import { clearConnection, getConnection, setConnection } from '../lib/connection'
import { storedShortcut } from '../lib/shortcut'

/**
 * Runs on our own site only (wxt.config.ts sets `matches` to the build's server) and does one thing: receives the
 * device key from the `#/connect-extension` page and stores it (lib/bridge.ts has the messages). It reads nothing
 * else from the page.
 */
export default defineContentScript({
  matches: ['https://stashmine.app/*'],
  runAt: 'document_idle',
  main() {
    if (window.location.origin !== SERVER) return
    const post = (message: ExtensionMessage) => window.postMessage(message, SERVER)

    const hello = async () => {
      const current = await getConnection(SERVER)
      post({
        source: EXTENSION_SOURCE,
        type: 'hello',
        protocol: PROTOCOL,
        browser: browserName(import.meta.env.BROWSER, navigator.userAgent),
        deviceId: current?.deviceId ?? null,
      })
    }

    window.addEventListener('message', async (event) => {
      const message = readPageMessage(event, { origin: window.location.origin, window, server: SERVER })
      if (!message) return
      if (message.type === 'ping') return void hello()
      if (message.type === 'disconnect') {
        // Only the key it names: a page can't make the extension forget an account it didn't sign out of.
        if ((await getConnection(SERVER))?.deviceId === message.deviceId) await clearConnection()
        return post({ source: EXTENSION_SOURCE, type: 'disconnected', deviceId: message.deviceId })
      }
      const { token, deviceId, username, server } = message
      await setConnection({ token, deviceId, username, server })
      post({ source: EXTENSION_SOURCE, type: 'connected', deviceId, shortcut: await storedShortcut() })
    })

    void hello()
  },
})
