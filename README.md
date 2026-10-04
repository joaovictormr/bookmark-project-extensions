# StashMine browser extension

Saves the page you're on to [StashMine](https://stashmine.app) in one click. One codebase for Chrome, Edge, Brave,
Opera, Arc and Firefox (Safari later), built with [WXT](https://wxt.dev). The product, API and web app are in the main
repo, `joaovictormr/bookmark-project`; this repo is usually cloned inside it as `bookmark-project-extensions/`. Design
decisions and conventions are in [`CLAUDE.md`](CLAUDE.md).

## What it does

| How | What happens |
|---|---|
| Toolbar button, or **Alt+Shift+S** | The popup opens and saves the current tab right away: **Saved**, **Already in your saves**, a plan limit, or an error with **Try again** |
| Right-click → **Save page to StashMine** / **Save link to StashMine** | Saves without opening anything; the toolbar button shows ✓ or ! for 4 seconds, with the outcome as its tooltip |
| First install | Opens `stashmine.app/#/connect-extension` to connect the account |
| Not connected (or the key was removed in Settings → Devices) | The popup offers **Connect**; a right-click save opens the connect page |

The popup's footer shows the account ("Saving to @you") and **Disconnect**, which forgets the key in this browser (it
stays in the web app's Settings → Devices until removed there). Texts are in English and Brazilian Portuguese, picked
by the browser's language.

## Running it

```sh
pnpm install
pnpm dev            # Chrome, against http://localhost:5173 (the main repo's `pnpm dev`)
pnpm dev:firefox    # the same in Firefox
```

`pnpm dev` opens a browser with the extension loaded and reloads it as you edit. Start the main repo's `pnpm dev`
first so the web app (and its `/api` proxy) is on `localhost:5173`, sign in there with an account (not a guest), then
click **Connect** in the popup.

To load a build in your own browser instead:

- **Chrome / Edge / Brave:** `pnpm build`, then `chrome://extensions` → turn on **Developer mode** → **Load
  unpacked** → pick `.output/chrome-mv3`. For a build against the local web app: `pnpm build --mode development`
  and pick `.output/chrome-mv3-dev`.
- **Firefox:** `pnpm build:firefox`, then `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → pick
  any file in `.output/firefox-mv3`. It's removed when Firefox closes.

## Which server a build saves to

| Build | Server |
|---|---|
| `pnpm dev`, `pnpm build --mode development` | `http://localhost:5173` |
| `pnpm build`, `pnpm zip` | `https://stashmine.app` |
| Any, with `WXT_SERVER_URL=https://…` | That server (a tunnel from the main repo's `pnpm dev:tunnel`, a staging server) |

The server decides the host permission, where the connect content script runs, and where saves go
(`lib/server.ts`, `wxt.config.ts`). A key made on one server is never used on another.

## Layout

```
entrypoints/
├── background.ts        ← right-click menu, the badge, the connect page on first install
├── connect.content.ts   ← runs on our site only: receives the key from #/connect-extension and stores it
└── popup/               ← the toolbar button's popup: saves the current tab and says how it went
lib/
├── bridge.ts            ← the messages with the web app's connect page (mirrors apps/web/src/lib/extensionBridge.ts)
├── connection.ts        ← the stored key, account and server (browser.storage.local)
├── share.ts             ← POST /api/share and what its answers mean
├── save.ts              ← saves to the connected account; forgets a key the server no longer knows
├── urls.ts              ← which tabs can be saved (web pages only)
├── server.ts, config.ts ← the build's server and its match pattern
└── i18n.ts              ← texts from public/_locales
public/
├── _locales/en, pt_BR   ← every text people see, in both languages (the store listing's name and description too)
└── icon/                ← 16, 32, 48 and 128 px, from the main repo's apps/web/public/icons/icon-512.png
```

## Checks

`pnpm check` runs oxlint, the type check and the tests (Vitest, with WXT's fake browser for storage). Code that
decides what happens to data gets tests; the popup and background are thin wiring around `lib/`.

## Permissions

`activeTab` (the current tab's address, only when you click, use the shortcut or the menu), `contextMenus`, `storage`,
and host access to the build's server only. Firefox can leave the host access off at install; the popup then asks
for it with an **Allow** button.

## Not built yet

- **Tried by hand in a browser:** the connect flow, saving, the badge and the Firefox permission prompt have only been
  checked by the tests and the builds so far. Firefox's `event.source === window` check in the content script in
  particular needs a real run.
- **Safari:** `wxt build -b safari` plus `xcrun safari-web-extension-converter`, and where the Xcode project lives
  (an open question in `CLAUDE.md`).
- **Stores:** listings, screenshots, the privacy policy link (`https://stashmine.app/privacy`), a reason for each
  permission, and Firefox's `data_collection_permissions` in the manifest (Firefox Add-ons asks for it on new
  extensions). `pnpm zip` / `pnpm zip:firefox` make the uploads (Firefox also wants the source zip WXT makes).
- **CI** (`pnpm check` on every push) and a pre-commit hook like the main repo's.
