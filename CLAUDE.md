# StashMine browser extensions

A toolbar button that saves the current tab to **StashMine** (stashmine.app) in one click, for people on a desktop
browser. The product, the API and the web app live in the main repo (`joaovictormr/bookmark-project`); this repo is
only the extension. This repo is usually cloned inside the main repo's folder as `bookmark-project-extensions/`
(ignored there), so the main repo's code and docs are one level up (`../`).

When a decision here depends on the product (plans, limits, wording, privacy), the main repo's `CLAUDE.md` is the
source of truth; read it rather than guessing. The original plan is in `../apps/api/TODO.md` → "browser extension".

## Decisions

- **Separate repo (decided 2026-10-04):** not `apps/extension` in the main monorepo, as first planned. The extension
  ships on its own schedule through the stores, so it has its own history, CI and releases.
- **One codebase for every browser.** Chrome, Edge, Brave, Opera, Arc and Firefox all run the same WebExtensions
  API (Manifest V3); Safari runs it too, wrapped in an Xcode app. Browser differences stay in a few small, named
  places, never in forks of the code.
- **Tooling: [WXT](https://wxt.dev)** (Vite based, like the web app). It builds a per-browser bundle and manifest
  from one source (`wxt build -b chrome|firefox|safari`), reloads during development, and zips for the stores. Use
  `browser.*` (WXT's polyfilled namespace), not `chrome.*`, so Firefox and Safari work unchanged.
- **TypeScript, no UI framework to start.** The popup has a handful of states (saving, saved, already saved, limit
  reached, connect your account, error). Add Preact/React only if the UI grows past that.
- **Saving (decided 2026-10-04; built):** opening the popup saves the current tab at once (no "Save" button to
  click); the keyboard shortcut (Alt+Shift+S) is `_execute_action`, so it does the same. The right-click menu saves
  without a popup and shows ✓ or ! on the toolbar button for 4 s. A first install opens the connect page.
- **Server per build (decided 2026-10-04; built):** development builds save to `http://localhost:5173`, others to
  `https://stashmine.app`, `WXT_SERVER_URL` overrides (`lib/server.ts`); host permission, the content script's
  `matches` and the API calls all follow it, and a stored key is used only on the server it was made on.
- **Manifest V3 for Firefox too** (`manifestVersion: 3` in `wxt.config.ts`; WXT would build V2), Firefox 128+.
- **The popup uses the web app's light palette**, the app's default theme.
- **Order of browsers:** Chrome (covers Edge, Brave, Opera, Arc with the same build) → Firefox → Safari last
  (Xcode wrapper and App Store review).

## How it works

- **Saving:** the background service worker sends `POST https://stashmine.app/api/share` with
  `Authorization: Bearer stw_…` and `{ "url": tab.url, "title": tab.title }`. That endpoint accepts only a device
  token (never cookies) and saves through the normal path (link safety, plan limits, AI allowance). `201` = saved,
  `200` with `duplicate: true` = already saved, `401` = token unknown or revoked (back to "connect your account"),
  `429` = rate limited (`Retry-After`), errors are `{ error: { code, message } }` with `message` already in the
  language of `Accept-Language`. `limit_reached` responses carry an `upgrade` hint; show the message and link to the
  web app, never an in-extension purchase.
- **Three ways to save:** toolbar button, right-click "Save to StashMine" (page and links), and a keyboard shortcut
  (`commands`). All three grant `activeTab`, so the extension never needs to read every site.
- **Connecting the account (no cookies):** the extension opens `https://stashmine.app/#/connect-extension`. A content
  script that runs **only** on `https://stashmine.app/*` talks to that page with `window.postMessage` on the same
  window (the page's side is `../apps/web/src/lib/extensionBridge.ts`, which is the source of truth for the format):

  | Direction | Message |
  |---|---|
  | extension → page, at load and on every ping | `{ source: 'stashmine-extension', type: 'hello', protocol: 1, browser: 'chrome'\|'edge'\|'firefox'\|'safari'\|'other', deviceId: string \| null }` |
  | page → extension | `{ source: 'stashmine-web', type: 'ping' }` |
  | page → extension | `{ source: 'stashmine-web', type: 'connect', token, deviceId, username, server }` |
  | extension → page, once the token is stored | `{ source: 'stashmine-extension', type: 'connected', deviceId }` |
  | page → extension, on sign-out | `{ source: 'stashmine-web', type: 'disconnect', deviceId }` |
  | extension → page | `{ source: 'stashmine-extension', type: 'disconnected', deviceId }` |

  Accept a message only when `event.source === window`, `event.origin` is our origin and the shape matches; post
  with `targetOrigin` set to our origin, never `'*'`. `deviceId` in the hello is the device the extension was
  connected with before (the page removes it once the new one is confirmed); `server` is the origin the token
  belongs to, so the extension saves there. The page waits 3 s for a hello and 8 s for `connected`, and removes
  the new token if it doesn't come. A change to these messages bumps `protocol` on both sides. Guests are asked to
  sign in on the page. The token shows in the web app's Settings → Devices and is revocable there; it counts toward
  the 10 devices of an account.
- **Signing out of the web app disconnects the extension in that browser (decided 2026-10-04):** the page removes the
  key on the server, then sends `disconnect`; the extension forgets its key only if the `deviceId` matches. Added
  without bumping `protocol`: an older extension ignores it and forgets the key on its next save (401).
- **Token hygiene:** the token never goes into a log, an error, the popup's DOM or any request other than
  `/api/share`. Signing out of the extension forgets it locally (the web app's Devices list revokes it for real).

## Permissions (keep them minimal; every one needs a justification in the stores)

- `activeTab`, `contextMenus`, `storage`, `notifications` only if a toast is really needed.
- Host permission only for `https://stashmine.app/*` (the API calls and the connect content script). Never
  `<all_urls>` or broad host permissions: they trigger scary install warnings and slower store reviews.
- No remote code: everything ships in the bundle (MV3 forbids it anyway).

## What the main repo provides (built 2026-10-04, branch `feature/browser-extension`)

1. `/api/share` accepts extension origins (`chrome-extension://…`, `moz-extension://…`, `safari-web-extension://…`):
   it's mounted before the CSRF Origin check in `apps/api/src/app.ts`. Every other route still refuses them.
2. The `#/connect-extension` page that creates the token and passes it to the content script (above).
   `TESTING.md` there has a console snippet that plays the extension's part.

## Conventions (same as the main repo)

- **Every user-visible text exists in English and Brazilian Portuguese**, in `_locales/en/messages.json` and
  `_locales/pt_BR/messages.json` (the browser picks by its UI language; English is `default_locale`). Store
  listings too. Use "save"/"Salve" wording like the web app.
- **Code that decides what happens to data gets tests** (Vitest): response handling, the token handoff checks,
  URL filtering (don't offer to save `chrome://`, `about:`, `file://` or the store pages). Every bug fix gets a test
  that fails without it. Presentational code and thin wrappers around a browser API are exempt.
- The API base URL comes from build config: `https://stashmine.app` in store builds, `http://localhost:8787` (or a
  tunnel) in development. The API's `WEB_ORIGINS` has to allow nothing extra for the extension once step 1 lands.
- Keep dependencies lean. Icons follow the web app's (`../apps/web/public/`).

## Keep the documentation current (always)

- **README.md**: how to install, run in development, load the unpacked extension in each browser, build and zip
  for each store, and what's not built yet. Update it in the same commit as the change.
- **CLAUDE.md** (this file): decisions and conventions. Record new decisions here, with the date.
- When a change here needs something in the main repo (API, web app, docs), say so and update the main repo's
  `apps/api/TODO.md` → browser extension.

## Stores (later)

Chrome Web Store (US$5 once, also covers people on Edge/Brave/Opera who install from it), Microsoft Edge Add-ons
(free, optional), Firefox Add-ons (free), Safari through the App Store. Each needs screenshots, the privacy policy
(`https://stashmine.app/privacy`) and a reason for every permission.

## Open questions

- **Safari packaging:** its own small macOS app in this repo, or a target in the main repo's Xcode project
  (`apps/mobile`), which would also bring it to Safari on iPhone. Decide when Chrome and Firefox are out.
