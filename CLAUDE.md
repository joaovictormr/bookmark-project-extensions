# StashMine browser extensions

A toolbar button that saves the current tab to **StashMine** (stashmine.app) in one click, for people on a desktop
browser. The product, the API and the web app live in the main repo (`joaovictormr/bookmark-project`); this repo is
only the extension. This repo is usually cloned inside the main repo's folder as `bookmark-project-extensions/`
(ignored there), so the main repo's code and docs are one level up (`../`).

When a decision here depends on the product (plans, limits, wording, privacy), the main repo's `CLAUDE.md` is the
source of truth; read it rather than guessing. The original plan is in `../apps/api/TODO.md` → "browser extension".

## Decisions

- **Launch together (decided 2026-10-10, order revised 2026-10-12):** the extension is required for launch, not a
  later add-on. Chrome and Firefox go public the same day as the website. **Safari is tied to the iPhone app's
  release:** both go through App Store review, and they're submitted only after the website is live (reviewers must
  connect the extension on the real site, not the Coming soon page), so Safari ships when the iPhone app is approved
  (main repo's `CLAUDE.md` → Launch). Later releases follow their own schedule.
- **Separate repo (decided 2026-10-04):** not `apps/extension` in the main monorepo, as first planned. The extension
  ships on its own schedule through the stores, so it has its own history, CI and releases (the first release excepted:
  see Launch together above).
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
  without a popup; it draws a small message on the page (`lib/toast.ts`, injected with `scripting` through the menu
  click's `activeTab`, in a closed shadow root) and shows ✓ or ! on the toolbar button for 4 s. A first install opens the connect page.
- **Saving pictures (decided and built 2026-10-19):** right-click a picture → **Save picture to StashMine** makes an
  image save (Pro and Team; the main repo's `CLAUDE.md` → Image saves) through `POST /api/share/image`, as the iPhone
  share extension does; other plans get the server's message. The server takes a JPEG and nothing else, so
  `lib/picture.ts` shrinks it first like the web app (within 1,600 × 4,000 px, white behind transparency, 3 MB at
  most). The picture's own file is downloaded when its server allows an extension to read it (YouTube, X and Amazon
  do; Pinterest and Google don't, and `activeTab` covers the page's own address only); otherwise it's cut out of a
  capture of the visible tab (`tabs.captureVisibleTab`, allowed by the menu click's `activeTab`), so only what shows
  on screen is saved, and only the crop is sent. No new permission. Pictures inside a frame, and sites that cover
  their pictures (Instagram), don't offer the menu or can't be found: save the page instead.
- **The shortcut is shown (decided 2026-10-12; built):** the toolbar button's tooltip names it ("Save to StashMine
  (Alt+Shift+S)", `lib/shortcut.ts`), read from `commands.getAll()` each time the background starts (and on Firefox's
  `commands.onChanged`), so a shortcut changed in the browser's settings shows too. The background keeps it in
  storage for the content script, which can't read commands, and the `connected` message carries it so the web
  app's connect page can say "press Alt+Shift+S on any page". `null` when the person removed the shortcut.
- **Server per build (decided 2026-10-04; built):** development builds save to `http://localhost:5173`, others to
  `https://stashmine.app`, `WXT_SERVER_URL` overrides (`lib/server.ts`); host permission, the content script's
  `matches` and the API calls all follow it, and a stored key is used only on the server it was made on.
- **Manifest V3 for Firefox too** (`manifestVersion: 3` in `wxt.config.ts`; WXT would build V2), Firefox 140+ (142 on
  Android), because the Firefox build declares the data it sends, as Firefox Add-ons requires of new extensions:
  `data_collection_permissions.required: ['browsingActivity', 'websiteContent']` (a saved page's address and title, and
  a picture the person saves, which `websiteContent` covers).
  Change it whenever the extension starts sending anything else, and the main repo's privacy policy with it.
- **The popup uses the web app's light palette**, the app's default theme.
- **Safari on iPhone and iPad ships inside the main repo's iOS app (decided and built 2026-10-11).** A
  `SafariExtension` target in `../apps/mobile` (`app.stashmine.SafariExtension`) carries this repo's
  `pnpm build:safari` output: `pnpm safari:sync` there builds this repo and copies `.output/safari-mv3/` into the
  target's `Resources/`, which the main repo commits. So a change here reaches Safari only after that copy and an app
  release. **A new top-level folder in the build** (WXT adds `chunks/`, `assets/`…) must be added to that target's
  kept folders (`explicitFolders`), or its files land flat and break the extension; the sync script refuses until it
  is. It keeps its key in its own storage, like the other browsers. Safari on the Mac: still open, below.
- **Order of work:** Chrome (covers Edge, Brave, Opera, Arc with the same build) → Firefox → Safari last
  (Xcode wrapper and App Store review). All three must be ready by launch day (Launch together above).

## How it works

- **Saving:** the background service worker sends `POST https://stashmine.app/api/share` with
  `Authorization: Bearer stw_…` and `{ "url": tab.url, "title": tab.title }`. That endpoint accepts only a device
  token (never cookies) and saves through the normal path (link safety, plan limits, AI allowance). `201` = saved,
  `200` with `duplicate: true` = already saved, `401` = token unknown or revoked (back to "connect your account"),
  `429` = rate limited (`Retry-After`), errors are `{ error: { code, message } }` with `message` already in the
  language of `Accept-Language`. `limit_reached` responses carry an `upgrade` hint; show the message and link to the
  web app, never an in-extension purchase.
- **Three ways to save:** toolbar button, right-click "Save to StashMine" (page, link and picture), and a keyboard
  shortcut (`commands`). All three grant `activeTab`, so the extension never needs to read every site.
- **Connecting the account (no cookies):** the extension opens `https://stashmine.app/#/connect-extension`. A content
  script that runs **only** on `https://stashmine.app/*` talks to that page with `window.postMessage` on the same
  window (the page's side is `../apps/web/src/lib/extensionBridge.ts`, which is the source of truth for the format):

  | Direction | Message |
  |---|---|
  | extension → page, at load and on every ping | `{ source: 'stashmine-extension', type: 'hello', protocol: 1, browser: 'chrome'\|'edge'\|'firefox'\|'safari'\|'other', deviceId: string \| null }` |
  | page → extension | `{ source: 'stashmine-web', type: 'ping' }` |
  | page → extension | `{ source: 'stashmine-web', type: 'connect', token, deviceId, username, server }` |
  | extension → page, once the token is stored | `{ source: 'stashmine-extension', type: 'connected', deviceId, shortcut }` |
  | page → extension, on sign-out | `{ source: 'stashmine-web', type: 'disconnect', deviceId }` |
  | extension → page | `{ source: 'stashmine-extension', type: 'disconnected', deviceId }` |

  Accept a message only when `event.source === window`, `event.origin` is our origin and the shape matches; post
  with `targetOrigin` set to our origin, never `'*'`. `deviceId` in the hello is the device the extension was
  connected with before (the page removes it once the new one is confirmed); `server` is the origin the token
  belongs to, so the extension saves there. `shortcut` in `connected` is the save shortcut as the browser shows it, or null (added
  without bumping `protocol`: the page treats it as optional). The page waits 3 s for a hello and 8 s for `connected`, and removes
  the new token if it doesn't come. A change to these messages bumps `protocol` on both sides. Guests are asked to
  sign in on the page. The token shows in the web app's Settings → Devices and is revocable there; it counts toward
  the 10 devices of an account.
- **Signing out of the web app disconnects the extension in that browser (decided 2026-10-04):** the page removes the
  key on the server, then sends `disconnect`; the extension forgets its key only if the `deviceId` matches. Added
  without bumping `protocol`: an older extension ignores it and forgets the key on its next save (401).
- **Token hygiene:** the token never goes into a log, an error, the popup's DOM or any request other than
  `/api/share` and `/api/share/image`. Signing out of the extension forgets it locally (the web app's Devices list revokes it for real).

## Permissions (keep them minimal; every one needs a justification in the stores)

- `activeTab`, `contextMenus`, `scripting` (the right-click save's message on the page, and finding a right-clicked
  picture on it), `storage`. No
  `notifications`: the on-page message does the job without another permission.
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

## Stores (required for launch)

The text to paste is in `STORE_LISTING.md` (drafted 2026-10-18). Tried by hand in Chrome and Firefox by the owner
(2026-10-18): connecting, saving, the right-click menu and the shortcut work. Chrome Web Store (US$5 once, also covers people on Edge/Brave/Opera who install from it), Firefox Add-ons (free),
Safari through the App Store; Microsoft Edge Add-ons (free) is optional. Each needs screenshots, the privacy policy
(`https://stashmine.app/privacy`) and a reason for every permission. Submit Chrome and Firefox early enough that their reviews
are done before launch day, and keep each approved version from going public until the website does (check each
store's option for holding an approved release). Safari is submitted with the iPhone app after the website is live.
**Revised 2026-10-18 (a quiet launch):** reviewers must connect on the real site, which the Coming soon page blocks,
so the website goes up a few days early without an announcement, Chrome and Firefox are submitted then, and the
launch is announced once both are approved.

## Open questions

- **Safari packaging on the Mac (looked at 2026-10-04; needed before launch, since Safari ships with the iPhone app;
  iPhone and iPad settled 2026-10-11, see Decisions).** Safari runs the same code; it ships inside an app made with
  `xcrun safari-web-extension-packager .output/safari-mv3` (Xcode 26; a test project compiled for Mac and iPhone
  unsigned). Where that app lives:
  - **iPhone and iPad: a target in the main repo's iOS app** (`apps/mobile`, recommended). People install one
    StashMine app and get the share sheet and the Safari extension; a second iPhone app with the same name would
    confuse them and App Review. The extension still connects through `#/connect-extension` and keeps its key in its
    own storage, like in the other browsers (it doesn't use the app's keychain).
  - **Mac: its own small macOS app** (the packager's Mac target, in this repo), since a Safari extension for Mac comes in a
    Mac app (an iPhone app running on a Mac isn't known to carry one; check before deciding). Its only screen tells people to turn the extension on in Safari → Settings →
    Extensions. Sold as the same product as the iPhone app if App Store Connect allows it (universal purchase).
  - Watch: Safari asks people to allow the extension per website (the popup must handle "no access yet"), iPhone
    Safari has no right-click menu or keyboard shortcuts (the toolbar popup only), and developers report popups that
    don't open on iOS 26 for some converted extensions, so test on a real iPhone early.
