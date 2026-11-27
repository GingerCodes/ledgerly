/**
 * Google Analytics 4 page views, loaded only when a measurement ID is configured AND the user has said yes.
 * Only fixed screen paths such as `/overview` are sent: never names, emails, amounts, descriptions or user IDs.
 */
const CONSENT_KEY = 'ledgerly-analytics-consent'

type Consent = 'granted' | 'denied'

declare global {
  interface Window {
    dataLayer?: unknown[]
    [key: `ga-disable-${string}`]: boolean | undefined
  }
}

function measurementId(): string | null {
  const id: unknown = import.meta.env.VITE_GA_MEASUREMENT_ID
  return typeof id === 'string' && /^G-[A-Z0-9]+$/.test(id.trim()) ? id.trim() : null
}

export function analyticsAvailable(): boolean {
  return measurementId() !== null
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
  // gtag.js reads `arguments` objects from the data layer, not arrays
  // eslint-disable-next-line prefer-rest-params
  ;(window.dataLayer ??= []).push(arguments)
}

function load(id: string): void {
  if (loaded) return
  loaded = true
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(script)
  gtag('js', new Date())
  gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false })
}

/** Starts analytics if it is configured and allowed; call again after the user changes their answer. */
export function initAnalytics(): void {
  const id = measurementId()
  if (!id) return
  if (getConsent() !== 'granted') {
    window[`ga-disable-${id}`] = true // tells an already-loaded gtag.js to stop sending
    return
  }
  window[`ga-disable-${id}`] = false
  load(id)
  if (lastPage) sendPageView(lastPage.path, lastPage.title)
}

export function setConsent(value: Consent): void {
  try {
    localStorage.setItem(CONSENT_KEY, value)
  } catch {
    // storage blocked: the choice only lasts until reload
  }
  initAnalytics()
}

function sendPageView(path: string, title: string): void {
  gtag('event', 'page_view', { page_path: path, page_title: title, page_location: `${window.location.origin}${path}` })
}

/** Records a screen view. Safe to call anywhere; does nothing unless analytics is configured and allowed. */
export function trackPageView(path: string, title: string): void {
  lastPage = { path, title }
  if (!loaded || getConsent() !== 'granted') return
  sendPageView(path, title)
}

/** Test helper: forget loaded state. */
export function resetAnalyticsForTests(): void {
  loaded = false
  lastPage = null
}
