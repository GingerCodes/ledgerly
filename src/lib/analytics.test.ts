// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { analyticsAvailable, getConsent, initAnalytics, resetAnalyticsForTests, setConsent, trackPageView } from './analytics'

// Node's own experimental localStorage can shadow jsdom's, so use a plain in-memory one.
function memoryStorage() {
  const data = new Map<string, string>()
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
}

const pageViews = () => (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>)).filter((entry) => entry[0] === 'event' && entry[1] === 'page_view')

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  window.dataLayer = undefined
  document.head.innerHTML = ''
  resetAnalyticsForTests()
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('analytics', () => {
  it('does nothing without a valid measurement ID', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'not-an-id')
    expect(analyticsAvailable()).toBe(false)
    setConsent('granted')
    trackPageView('/overview', 'Overview')
    expect(document.querySelector('script')).toBeNull()
    expect(window.dataLayer).toBeUndefined()
  })

  it('loads nothing until the user agrees, then sends the page they are on', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    expect(analyticsAvailable()).toBe(true)
    expect(getConsent()).toBeNull()

    initAnalytics()
    trackPageView('/overview', 'Overview')
    expect(document.querySelector('script')).toBeNull()
    expect(pageViews()).toHaveLength(0)

    setConsent('granted')
    expect(document.querySelector('script')?.getAttribute('src')).toContain('id=G-TEST123')
    expect(pageViews()).toEqual([['event', 'page_view', expect.objectContaining({ page_path: '/overview', page_title: 'Overview' })]])

    trackPageView('/transactions', 'Transactions')
    expect(pageViews().map((entry) => (entry[2] as { page_path: string }).page_path)).toEqual(['/overview', '/transactions'])
  })

  it('stops sending after the user declines', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    setConsent('granted')
    trackPageView('/reports', 'Reports')
    setConsent('denied')
    trackPageView('/accounts', 'Accounts')
    expect(pageViews()).toHaveLength(1)
    expect(window['ga-disable-G-TEST123']).toBe(true)
  })
})
