import { defineConfig } from 'wxt'
import { matchPatternFor, serverFor } from './lib/server'

/**
 * One source, one build per browser: `wxt build -b chrome|firefox|safari`. The server the extension saves to is
 * picked per build (lib/server.ts): the local web app in development, stashmine.app otherwise.
 */
export default defineConfig({
  imports: false,
  // Manifest V3 everywhere, Firefox included (WXT would build V2 for it).
  manifestVersion: 3,
  manifest: ({ mode, browser }) => {
    const server = serverFor(mode, process.env.WXT_SERVER_URL)
    return {
      name: '__MSG_extName__',
      description: '__MSG_extDescription__',
      default_locale: 'en',
      // activeTab: the current tab's address, only when the person clicks, uses the shortcut or the right-click menu.
      permissions: ['activeTab', 'contextMenus', 'storage'],
      // Only our own site: the API calls and the connect page's content script.
      host_permissions: [matchPatternFor(server)],
      commands: {
        _execute_action: {
          suggested_key: { default: 'Alt+Shift+S', mac: 'Alt+Shift+S' },
          description: '__MSG_shortcutDescription__',
        },
      },
      // Firefox needs a fixed id (Chrome warns about the key, so only its build has it).
      ...(browser === 'firefox' && {
        browser_specific_settings: { gecko: { id: 'extension@stashmine.app', strict_min_version: '128.0' } },
      }),
    }
  },
  vite: ({ mode }) => ({
    define: { __STASHMINE_SERVER__: JSON.stringify(serverFor(mode, process.env.WXT_SERVER_URL)) },
  }),
  hooks: {
    // The connect content script runs on the build's server only (its `matches` in the entrypoint is a placeholder).
    'build:manifestGenerated': (wxt, manifest) => {
      const pattern = matchPatternFor(serverFor(wxt.config.mode, process.env.WXT_SERVER_URL))
      for (const script of manifest.content_scripts ?? []) script.matches = [pattern]
    },
  },
})
