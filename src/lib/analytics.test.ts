// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { analyticsAvailable, getConsent, initAnalytics, resetAnalyticsForTests, setConsent, trackPageView } from './analytics'

// Node's own experimental localStorage can shadow jsdom's, so use a plain in-memory one.
function memoryStorage() {
  const data = new Map<string, string>()
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
}

const pageViews = () => (window.dataLayer ?? []).filter((entry): entry is { event: string; page_path: string; page_title: string } => (entry as { event?: string }).event === 'virtual_page_view')

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  window.dataLayer = undefined
  document.head.innerHTML = ''
  resetAnalyticsForTests()
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('analytics', () => {
  it('does nothing without a valid measurement ID', () => {
    vi.stubEnv('VITE_GTM_ID', 'G-NOT-GTM')
    expect(analyticsAvailable()).toBe(false)
    setConsent('granted')
    trackPageView('/overview', 'Overview')
    expect(document.querySelector('script')).toBeNull()
    expect(window.dataLayer).toBeUndefined()
  })

  it('loads nothing until the user agrees, then sends the page they are on', () => {
    vi.stubEnv('VITE_GTM_ID', 'GTM-TEST123')
    expect(analyticsAvailable()).toBe(true)
    expect(getConsent()).toBeNull()

    initAnalytics()
    trackPageView('/overview', 'Overview')
    expect(document.querySelector('script')).toBeNull()
    expect(pageViews()).toHaveLength(0)

    setConsent('granted')
    expect(document.querySelector('script')?.getAttribute('src')).toContain('gtm.js?id=GTM-TEST123')
    expect(pageViews()).toEqual([expect.objectContaining({ page_path: '/overview', page_title: 'Overview' })])

    trackPageView('/transactions', 'Transactions')
    expect(pageViews().map((entry) => entry.page_path)).toEqual(['/overview', '/transactions'])
  })

  it('stops sending after the user declines', () => {
    vi.stubEnv('VITE_GTM_ID', 'GTM-TEST123')
    setConsent('granted')
    trackPageView('/reports', 'Reports')
    setConsent('denied')
    trackPageView('/accounts', 'Accounts')
    expect(pageViews()).toHaveLength(1)
    expect(Array.from((window.dataLayer ?? []).at(-1) as ArrayLike<unknown>)).toEqual(['consent', 'update', { analytics_storage: 'denied' }])
  })
})
