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
      // scripting: the "Saved" message a right-click save draws on the page (activeTab limits it to that tab).
      permissions: ['activeTab', 'contextMenus', 'scripting', 'storage'],
      // Only our own site: the API calls and the connect page's content script.
      host_permissions: [matchPatternFor(server)],
      commands: {
        _execute_action: {
          suggested_key: { default: 'Alt+Shift+S', mac: 'Alt+Shift+S' },
          description: '__MSG_shortcutDescription__',
        },
      },
      // Firefox needs a fixed id, and Firefox Add-ons asks new extensions what data they send (Firefox 140+): the
      // address (browsingActivity) and title (websiteContent) of a page the person chose to save. Chrome warns about
      // the key, so only the Firefox build has it.
      ...(browser === 'firefox' && {
        browser_specific_settings: {
          gecko: {
            id: 'extension@stashmine.app',
            strict_min_version: '140.0',
            data_collection_permissions: { required: ['browsingActivity', 'websiteContent'] },
          },
          // Firefox for Android reads that declaration from 142.
          gecko_android: { strict_min_version: '142.0' },
        },
      }),
    }
  },
  vite: ({ mode }) => ({
    define: { __STASHMINE_SERVER__: JSON.stringify(serverFor(mode, process.env.WXT_SERVER_URL)) },
  }),
  hooks: {
    // The connect content script runs on the build's server only (its `matches` in the entrypoint is a placeholder).
    // Set on the entrypoint, not the manifest: development builds register content scripts at run time from it.
    'entrypoints:resolved': (wxt, entrypoints) => {
      const pattern = matchPatternFor(serverFor(wxt.config.mode, process.env.WXT_SERVER_URL))
      for (const entrypoint of entrypoints) {
        if (entrypoint.type === 'content-script') entrypoint.options.matches = [pattern]
      }
    },
  },
})
