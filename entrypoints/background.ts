import { browser } from 'wxt/browser'
import { defineBackground } from 'wxt/utils/define-background'
import { CONNECT_URL } from '../lib/config'
import { t } from '../lib/i18n'
import { findPicture, PictureError, readPicture, visibleCrop, type Capture } from '../lib/picture'
import { isConnected, savePictureToAccount, saveToAccount } from '../lib/save'
import { readShortcut, storeShortcut, titleWithShortcut } from '../lib/shortcut'
import { showToast, TOAST_MS, type ToastKind } from '../lib/toast'
import { isSavable } from '../lib/urls'

const MENU_PAGE = 'save-page'
const MENU_LINK = 'save-link'
const MENU_PICTURE = 'save-picture'
/** How long the toolbar badge shows a right-click save's outcome. */
const BADGE_MS = 4000

/**
 * The right-click menu ("Save page" / "Save link" / "Save picture"), and the connect page on first install. The toolbar button and the
 * keyboard shortcut open the popup, which saves on its own (entrypoints/popup).
 */
export default defineBackground(() => {
  // The tooltip names the keyboard shortcut. Read each time the worker starts (people change it in the browser's
  // shortcut settings; only Firefox says when), and kept for the connect page.
  void refreshTitle()
  ;(browser.commands as { onChanged?: { addListener: (listener: () => void) => void } }).onChanged?.addListener(() => void refreshTitle())

  browser.runtime.onInstalled.addListener(({ reason }) => {
    browser.contextMenus.removeAll().then(() => {
      browser.contextMenus.create({ id: MENU_PAGE, title: t('menuSavePage'), contexts: ['page'] })
      browser.contextMenus.create({ id: MENU_LINK, title: t('menuSaveLink'), contexts: ['link'] })
      browser.contextMenus.create({ id: MENU_PICTURE, title: t('menuSavePicture'), contexts: ['image'] })
    })
    if (reason === 'install') void browser.tabs.create({ url: CONNECT_URL })
  })

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === MENU_PICTURE) return savePictureFrom(info, tab)
    const url = info.menuItemId === MENU_LINK ? info.linkUrl : tab?.url
    const title = info.menuItemId === MENU_LINK ? undefined : tab?.title
    const tabId = tab?.id
    if (!isSavable(url)) return tell(tabId, 'error', t('cantSaveThisPage'))
    const result = await saveToAccount(url, title)
    if (result.kind === 'not-connected' || result.kind === 'unauthorized') {
      await browser.tabs.create({ url: CONNECT_URL })
      return
    }
    if (result.kind === 'saved' || result.kind === 'duplicate') {
      // The tab's own title: a new save's on the server is only the domain until it's read. None for a link.
      const detail = info.menuItemId === MENU_LINK ? null : (tab?.title || result.title)
      tell(tabId, 'ok', t(result.kind === 'saved' ? 'saved' : 'alreadySaved'), detail)
    } else tell(tabId, 'error', t('errorHeading'), result.message ?? t('couldntReach'))
  })
})

type MenuInfo = Parameters<Parameters<typeof browser.contextMenus.onClicked.addListener>[0]>[0]
type Tab = Parameters<Parameters<typeof browser.contextMenus.onClicked.addListener>[0]>[1]

/**
 * Right-click a picture → an image save (Pro and Team; the server says so on other plans). The picture is read and
 * shrunk here (lib/picture.ts), then sent to POST /api/share/image.
 */
async function savePictureFrom(info: MenuInfo, tab: Tab) {
  const tabId = tab?.id
  if (!(await isConnected())) {
    await browser.tabs.create({ url: CONNECT_URL })
    return
  }
  let picture: Blob
  try {
    picture = await readPicture(info.srcUrl, { capture: () => captureOnScreen(info, tab) })
  } catch (error) {
    const tooLarge = error instanceof PictureError && error.reason === 'too-large'
    return tell(tabId, 'error', t('errorHeading'), t(tooLarge ? 'pictureTooLarge' : 'pictureUnreadable'))
  }
  if (tabId !== undefined) void browser.action.setBadgeText({ tabId, text: '…' })
  const result = await savePictureToAccount(picture)
  if (result.kind === 'not-connected' || result.kind === 'unauthorized') {
    if (tabId !== undefined) void browser.action.setBadgeText({ tabId, text: '' })
    await browser.tabs.create({ url: CONNECT_URL })
    return
  }
  if (result.kind === 'saved' || result.kind === 'duplicate') tell(tabId, 'ok', t(result.kind === 'saved' ? 'pictureSaved' : 'pictureAlreadySaved'))
  else tell(tabId, 'error', t('errorHeading'), result.message ?? t('couldntReach'))
}

/**
 * The picture as it shows in the tab, for one the extension can't download: a capture of the visible tab (allowed by
 * the menu click's `activeTab`) and the picture's box in it. Pictures inside a frame aren't found (their box isn't the
 * tab's).
 */
async function captureOnScreen(info: MenuInfo, tab: Tab): Promise<Capture | null> {
  if (tab?.id === undefined || !info.srcUrl || (info.frameId ?? 0) !== 0) return null
  try {
    const [found] = await browser.scripting.executeScript({ target: { tabId: tab.id }, func: findPicture, args: [info.srcUrl] })
    const where = found?.result
    if (!where) return null
    const shot = await browser.tabs.captureVisibleTab(tab.windowId, { format: 'png' })
    const source = await createImageBitmap(await (await fetch(shot)).blob())
    const crop = visibleCrop(where.box, where.viewport, { width: source.width, height: source.height })
    return crop ? { source, crop } : null
  } catch {
    return null
  }
}

/**
 * How a right-click save went: a small message on the page (the menu click grants `activeTab`, which lets the
 * extension draw it), and a ✓ or ! on the toolbar button, which is all that shows where pages can't be drawn on.
 */
function tell(tabId: number | undefined, kind: ToastKind, message: string, detail: string | null = null) {
  if (tabId === undefined) return
  void browser.scripting
    .executeScript({ target: { tabId }, func: showToast, args: [message, kind, detail, TOAST_MS] })
    .catch(() => {})
  badge(tabId, kind, detail ? `${message}: ${detail}` : message)
}

/** A ✓ or ! on the toolbar button for a few seconds, with the outcome as its tooltip. */
function badge(tabId: number, kind: ToastKind, title: string) {
  void browser.action.setBadgeBackgroundColor({ tabId, color: kind === 'ok' ? '#2f8f5b' : '#c2410c' })
  void browser.action.setBadgeText({ tabId, text: kind === 'ok' ? '✓' : '!' })
  void browser.action.setTitle({ tabId, title })
  setTimeout(() => {
    void browser.action.setBadgeText({ tabId, text: '' })
    void actionTitle().then((title) => browser.action.setTitle({ tabId, title }))
  }, BADGE_MS)
}

/** "Save to StashMine (Alt+Shift+S)", or without the keys when there's no shortcut. */
async function actionTitle(): Promise<string> {
  return titleWithShortcut(t('actionTitle'), await readShortcut())
}

/** Puts the shortcut in the toolbar button's tooltip and remembers it for the connect page. */
async function refreshTitle() {
  const shortcut = await readShortcut()
  await storeShortcut(shortcut)
  await browser.action.setTitle({ title: titleWithShortcut(t('actionTitle'), shortcut) })
}
