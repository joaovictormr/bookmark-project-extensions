import { browser } from 'wxt/browser'
import { defineBackground } from 'wxt/utils/define-background'
import { CONNECT_URL } from '../lib/config'
import { t } from '../lib/i18n'
import { saveToAccount } from '../lib/save'
import { isSavable } from '../lib/urls'

const MENU_PAGE = 'save-page'
const MENU_LINK = 'save-link'
/** How long the toolbar badge shows a right-click save's outcome. */
const BADGE_MS = 4000

/**
 * The right-click menu ("Save page" / "Save link"), and the connect page on first install. The toolbar button and the
 * keyboard shortcut open the popup, which saves on its own (entrypoints/popup).
 */
export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    browser.contextMenus.removeAll().then(() => {
      browser.contextMenus.create({ id: MENU_PAGE, title: t('menuSavePage'), contexts: ['page'] })
      browser.contextMenus.create({ id: MENU_LINK, title: t('menuSaveLink'), contexts: ['link'] })
    })
    if (reason === 'install') void browser.tabs.create({ url: CONNECT_URL })
  })

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    const url = info.menuItemId === MENU_LINK ? info.linkUrl : tab?.url
    const title = info.menuItemId === MENU_LINK ? undefined : tab?.title
    const tabId = tab?.id
    if (!isSavable(url)) return badge(tabId, 'error', t('cantSaveThisPage'))
    const result = await saveToAccount(url, title)
    if (result.kind === 'not-connected' || result.kind === 'unauthorized') {
      await browser.tabs.create({ url: CONNECT_URL })
      return
    }
    if (result.kind === 'saved') badge(tabId, 'ok', t('saved'))
    else if (result.kind === 'duplicate') badge(tabId, 'ok', t('alreadySaved'))
    else badge(tabId, 'error', result.message ?? t('couldntReach'))
  })
})

/** A ✓ or ! on the toolbar button for a few seconds, with the outcome as its tooltip. */
function badge(tabId: number | undefined, kind: 'ok' | 'error', title: string) {
  if (tabId === undefined) return
  void browser.action.setBadgeBackgroundColor({ tabId, color: kind === 'ok' ? '#2f8f5b' : '#c2410c' })
  void browser.action.setBadgeText({ tabId, text: kind === 'ok' ? '✓' : '!' })
  void browser.action.setTitle({ tabId, title })
  setTimeout(() => {
    void browser.action.setBadgeText({ tabId, text: '' })
    void browser.action.setTitle({ tabId, title: t('actionTitle') })
  }, BADGE_MS)
}
