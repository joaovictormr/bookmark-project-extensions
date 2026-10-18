# Store listings

The text for the Chrome Web Store and Firefox Add-ons (AMO), in English and Brazilian Portuguese, ready to paste
(main repo's `apps/api/TODO.md` → Browser extension, step 5). Drafted 2026-10-18. Safari ships inside the iPhone app,
so its text is in the main repo's `apps/mobile/STORE_LISTING.md`. Keep this page in step with what the extension
does: when a feature or a permission changes, check it here too.

## Rules that shaped it

- **One purpose, said plainly.** Chrome rejects extensions whose listing or permissions go beyond a single purpose;
  ours is "save the page you're on to your StashMine account".
- **No prices or Pro.** The listing describes what every free account gets. The AI summaries have a monthly allowance,
  so they're mentioned with that caveat, like in the App Store text.
- **Every permission gets a reason**, matching `wxt.config.ts` and `CLAUDE.md` → Permissions. Adding a permission
  means a new reason here, and usually a slower review.
- **The data disclosures match the privacy policy** (`https://stashmine.app/privacy`) and the Firefox build's
  `data_collection_permissions` (`browsingActivity`, `websiteContent`).
- **Nothing that isn't live on launch day.** The iPhone app is released after the website and the extension
  (main repo's CLAUDE.md → Launch), so the text doesn't mention it; add it once the app is out.
- Limits: Chrome's summary is the manifest's `extDescription` (132 characters), its description up to 16,000; AMO's
  summary 250.

## Shared fields

| Field | Value |
|---|---|
| Name | StashMine (from `extName`) |
| Version | 1.0.0 (`package.json`) |
| Category | Chrome: Productivity → Tools. Firefox: Bookmarks, and Other |
| Languages | English (default), Português (Brasil): the `_locales` texts and the descriptions below |
| Website | `https://stashmine.app` |
| Support | `https://stashmine.app/support`, `hi@stashmine.app` |
| Privacy policy | `https://stashmine.app/privacy` (covers the extension) |
| Price | Free |
| Store icon | `public/icon/128.png` |

## Screenshots and images

Take them from a real build against production once the website is live, in English, with a tidy browser profile.
Then once more in Portuguese for the Portuguese listing (both stores take screenshots per language).

| # | Shows | Caption (en) | Legenda (pt-BR) |
|---|---|---|---|
| 1 | The popup saying **Saved** over an article | Save the page you're on in one click | Salve a página em que você está com um clique |
| 2 | Right-click → **Save link to StashMine**, and the **Saved** message in the corner | Save any link from the right-click menu | Salve qualquer link pelo menu do botão direito |
| 3 | The toolbar tooltip with **Alt+Shift+S** | Or press Alt+Shift+S | Ou aperte Alt+Shift+S |
| 4 | The web app's library with the saved card and its summary | Find it again in your library, summarized | Ache de novo na sua biblioteca, com resumo |
| 5 | The connect page saying **Ready!** | Connect your account once | Conecte sua conta uma vez |

- **Chrome:** 1–5 screenshots, 1280×800 (or 640×400), PNG or JPEG; a small promo tile 440×280; the marquee
  (1400×560) is optional.
- **Firefox:** screenshots at a 1.6:1 ratio (1280×800 works for both stores).

## Permission reasons (Chrome → Privacy practices; Firefox → notes to reviewer)

| Permission | Reason |
|---|---|
| Single purpose | Saves the page the user is on (or a link they right-click) to their StashMine account, so they can find it again later. |
| `activeTab` | Reads the current tab's address and title, only when the user clicks the toolbar button, presses the shortcut or picks "Save to StashMine" in the right-click menu, to save that page. |
| `contextMenus` | Adds "Save page to StashMine" and "Save link to StashMine" to the right-click menu. |
| `scripting` | After a right-click save, shows a small "Saved" message in that one tab (limited by `activeTab`). Nothing else runs on pages. |
| `storage` | Keeps the key that connects this browser to the user's account, and the account's @username, in the extension's local storage. |
| Host permission `https://stashmine.app/*` | Our own site only: sends the page to save to `https://stashmine.app/api/share`, and receives the key from the account page `stashmine.app/#/connect-extension` when the user connects. No other site is accessed. |
| Remote code | No. Everything runs from the extension's own files. |

## Data disclosures

**Chrome → Privacy practices → Data usage.** Tick **Web history** (the address of a page the user chooses to save)
and **Website content** (its title). Nothing else: no personal or financial information, health, location,
communications or activity tracking. The extension doesn't read passwords or what's typed on pages.

Then certify all three: the data isn't sold to third parties, isn't used or transferred for purposes unrelated to the
single purpose, and isn't used to determine creditworthiness or for lending.

**Firefox.** The manifest already declares `browsingActivity` and `websiteContent` as required (Firefox 140+), and
Firefox shows them at install. The listing needs the privacy policy link.

## Notes to the reviewer

Paste in Chrome's "Additional information" box (if asked) and in AMO's notes to the reviewer:

```
StashMine saves the page you're on to your StashMine account (https://stashmine.app), a free "save for later" app.

To test:
1. Install the extension. It opens https://stashmine.app/#/connect-extension.
2. Sign in there with any email address: a 6-digit code arrives by email. Google and Apple sign-in work too.
3. The page says "Ready!" and the extension is connected.
4. Open any article and click the StashMine button (or press Alt+Shift+S): the popup says "Saved". Right-click a
   link and pick "Save link to StashMine": a "Saved" message appears in the corner of the page.
5. The saves appear at https://stashmine.app.

The extension only talks to https://stashmine.app. It sends the address and title of a page only when you choose to
save it. The connection key is created by the signed-in website and can be removed in Settings → Devices.
```

**AMO also wants the source code**, because the build is bundled: upload the zip from `pnpm zip:firefox` (it makes
both the extension and the sources zip), with these build steps in the notes:

```
Requirements: Node.js 22 or later, pnpm 10.
pnpm install
pnpm build:firefox
The built extension is in .output/firefox-mv3.
```

## English

**Summary** (from `extDescription`, 75)

```
Save the page you're on to StashMine in one click, to find it again later.
```

**Description**

```
Found something worth keeping? Save it to StashMine in one click and find it again later, instead of losing it in a
pile of open tabs, bookmarks or a chat with yourself.

SAVE IN ONE CLICK
Click the StashMine button and the page you're on is saved. Press Alt+Shift+S to do the same from the keyboard, or
right-click any link and pick "Save link to StashMine" to save it without opening it.

IT FILLS ITSELF IN
Every save gets its title, picture and author. StashMine adds a short summary, a category and tags, so you know what
a link is without opening it. (AI summaries have a monthly allowance.)

FIND IT AGAIN
Your saves wait for you at stashmine.app: search titles, summaries, tags and your notes, filter
by site, category or type, and sort them into folders you can share with friends or keep to yourself.

PRIVATE BY DESIGN
The extension only talks to stashmine.app, and only sends a page's address and title when you choose to save it. It
doesn't read what you type or the pages you visit. Disconnect it any time from the extension or from Settings →
Devices.

Free to use. Connect your StashMine account once, with just your email, and start saving.
```

## Português (Brasil)

**Resumo** (de `extDescription`, 86)

```
Salve a página em que você está no StashMine com um clique, para achar de novo depois.
```

**Descrição**

```
Achou algo que vale guardar? Salve no StashMine com um clique e ache de novo depois, em vez de perder numa pilha de
abas abertas, favoritos ou numa conversa com você mesmo.

SALVE COM UM CLIQUE
Clique no botão do StashMine e a página em que você está é salva. Aperte Alt+Shift+S para fazer o mesmo pelo teclado,
ou clique com o botão direito em qualquer link e escolha "Salvar link no StashMine" para salvar sem abrir.

ELE SE PREENCHE SOZINHO
Cada link salvo ganha título, imagem e autor. O StashMine adiciona um resumo curto, uma categoria e tags, para você
saber do que se trata sem abrir. (Os resumos com IA têm uma cota mensal.)

ACHE DE NOVO
Seus links ficam em stashmine.app: busque por título, resumo, tags e suas notas, filtre por site,
categoria ou tipo, e organize em pastas que você compartilha com amigos ou guarda só para você.

PRIVADO DE VERDADE
A extensão só se comunica com stashmine.app, e só envia o endereço e o título de uma página quando você escolhe
salvá-la. Ela não lê o que você digita nem as páginas que você visita. Desconecte quando quiser, pela extensão ou em
Configurações → Dispositivos.

Grátis. Conecte sua conta do StashMine uma vez, só com seu e-mail, e comece a salvar.
```
