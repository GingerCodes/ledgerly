/**
 * Page views through Google Tag Manager, loaded only when a container ID is configured AND the user has said yes.
 * One `virtual_page_view` event is pushed per screen with a fixed path such as `/overview`: never names, emails,
 * amounts, descriptions or user IDs. The GTM container decides what to do with it (see README for the GA4 setup).
 */
const CONSENT_KEY = 'ledgerly-analytics-consent'

type Consent = 'granted' | 'denied'

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

function containerId(): string | null {
  const id: unknown = import.meta.env.VITE_GTM_ID
  return typeof id === 'string' && /^GTM-[A-Z0-9]+$/.test(id.trim()) ? id.trim() : null
}

export function analyticsAvailable(): boolean {
  return containerId() !== null
}

/** The user's answer, or null if they have not been asked yet. */
export function getConsent(): Consent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

let loaded = false
let lastPage: { path: string; title: string } | null = null

function gtag(..._args: unknown[]): void {
  // GTM reads `arguments` objects from the data layer for consent commands, not arrays
  // eslint-disable-next-line prefer-rest-params
  ;(window.dataLayer ??= []).push(arguments)
}

function load(id: string): void {
  if (loaded) return
  loaded = true
  const dataLayer = (window.dataLayer ??= [])
  dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)
}

function pushPageView(path: string, title: string): void {
  ;(window.dataLayer ??= []).push({ event: 'virtual_page_view', page_path: path, page_title: title, page_location: `${window.location.origin}${path}` })
}

/** Starts analytics if it is configured and allowed; call again after the user changes their answer. */
export function initAnalytics(): void {
  const id = containerId()
  if (!id) return
  if (getConsent() !== 'granted') {
    // a container that uses Consent Mode must also stop storing identifiers
    if (loaded) gtag('consent', 'update', { analytics_storage: 'denied' })
    return
  }
  gtag('consent', 'update', { analytics_storage: 'granted' })
  load(id)
  if (lastPage) pushPageView(lastPage.path, lastPage.title)
}

export function setConsent(value: Consent): void {
  try {
    localStorage.setItem(CONSENT_KEY, value)
  } catch {
    // storage blocked: the choice only lasts until reload
  }
  initAnalytics()
}

/** Records a screen view. Safe to call anywhere; does nothing unless analytics is configured and allowed. */
export function trackPageView(path: string, title: string): void {
  lastPage = { path, title }
  if (!loaded || getConsent() !== 'granted') return
  pushPageView(path, title)
}

/** Test helper: forget loaded state. */
export function resetAnalyticsForTests(): void {
  loaded = false
  lastPage = null
}
