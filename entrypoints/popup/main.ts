import { browser } from 'wxt/browser'
import { CONNECT_URL, SERVER } from '../../lib/config'
import { clearConnection, getConnection, type Connection } from '../../lib/connection'
import { t } from '../../lib/i18n'
import { saveToAccount } from '../../lib/save'
import { matchPatternFor } from '../../lib/server'
import { isSavable } from '../../lib/urls'

/**
 * The toolbar button (and its keyboard shortcut): opening the popup saves the current tab right away, then says how
 * it went. Plain DOM: it has a handful of states and nothing else.
 */

const app = document.getElementById('app')!
const ORIGINS = [matchPatternFor(SERVER)]

type Action = { label: string; run: () => void } | { label: string; href: string }

function render({
  icon,
  ok = false,
  heading,
  body,
  pageTitle,
  action,
  account,
}: {
  icon: string | 'spinner'
  ok?: boolean
  heading: string
  body?: string
  pageTitle?: string | null
  action?: Action
  account?: Connection | null
}) {
  app.replaceChildren()
  const badge = el('span', { className: ok ? 'badge ok' : 'badge' })
  if (icon === 'spinner') badge.append(el('span', { className: 'spinner' }))
  else badge.textContent = icon
  app.append(badge, el('h1', { textContent: heading }))
  if (pageTitle) app.append(el('p', { className: 'page-title', textContent: pageTitle }))
  if (body) app.append(el('p', { textContent: body }))
  if (action && 'href' in action) {
    app.append(el('a', { className: 'primary', href: action.href, target: '_blank', rel: 'noreferrer', textContent: action.label }))
  } else if (action) {
    const button = el('button', { className: 'primary', type: 'button', textContent: action.label })
    button.addEventListener('click', action.run)
    app.append(button)
  }
  if (account) {
    const disconnect = el('button', { type: 'button', textContent: t('disconnect') })
    disconnect.addEventListener('click', async () => {
      await clearConnection()
      showConnect(null)
    })
    app.append(el('footer', {}, [el('span', { textContent: t('savingTo', account.username) }), disconnect]))
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, children: Node[] = []) {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...children)
  return node
}

const openTab = (url: string) => () => {
  void browser.tabs.create({ url })
  window.close()
}

function showConnect(note: string | null) {
  render({
    icon: '🔗',
    heading: t('connectHeading'),
    body: note ?? t('connectBody'),
    action: { label: t('connectButton'), run: openTab(CONNECT_URL) },
  })
}

async function saveCurrentTab() {
  const connection = await getConnection(SERVER)
  if (!connection) return showConnect(null)

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  if (!isSavable(tab?.url)) {
    return render({ icon: '🚫', heading: t('cantSaveHeading'), body: t('cantSaveBody'), account: connection })
  }

  // Firefox can leave the site access off at install: ask for it (it must happen inside the click).
  if (!(await browser.permissions.contains({ origins: ORIGINS }))) {
    return render({
      icon: '🔑',
      heading: t('permissionHeading'),
      body: t('permissionBody', new URL(SERVER).host),
      action: {
        label: t('permissionButton'),
        run: () => {
          void browser.permissions.request({ origins: ORIGINS }).then((granted) => {
            if (granted) void saveCurrentTab()
          })
        },
      },
      account: connection,
    })
  }

  render({ icon: 'spinner', heading: t('saving'), pageTitle: tab.title, account: connection })
  const result = await saveToAccount(tab.url, tab.title)
  const open = { label: t('openStashMine'), href: SERVER }
  switch (result.kind) {
    case 'not-connected':
      return showConnect(null)
    case 'unauthorized':
      return showConnect(t('disconnectedBody'))
    case 'saved':
      return render({ icon: '✓', ok: true, heading: t('saved'), pageTitle: tab.title || result.title, action: open, account: connection })
    case 'duplicate':
      return render({ icon: '✓', ok: true, heading: t('alreadySaved'), pageTitle: tab.title || result.title, action: open, account: connection })
    case 'limit':
      return render({ icon: '⏳', heading: t('limitHeading'), body: result.message, action: open, account: connection })
    case 'error':
      return render({
        icon: '!',
        heading: t('errorHeading'),
        body: result.message ?? t('couldntReach'),
        action: { label: t('tryAgain'), run: () => void saveCurrentTab() },
        account: connection,
      })
  }
}

void saveCurrentTab()
