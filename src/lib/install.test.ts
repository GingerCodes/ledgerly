// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isStandalone, recentlyDismissed, rememberDismissal } from './install'

// Node's own experimental localStorage can shadow jsdom's, so use a plain in-memory one.
function memoryStorage() {
  const data = new Map<string, string>()
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
}

beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()))
afterEach(() => vi.unstubAllGlobals())

describe('install prompt state', () => {
  it('stays dismissed for 30 days, then asks again', () => {
    const day = 24 * 60 * 60 * 1000
    expect(recentlyDismissed(1_000)).toBe(false)
    rememberDismissal(1_000)
    expect(recentlyDismissed(1_000 + 29 * day)).toBe(true)
    expect(recentlyDismissed(1_000 + 31 * day)).toBe(false)
  })

  it('detects the installed (standalone) app', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(display-mode: standalone)' }))
    expect(isStandalone()).toBe(true)
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(isStandalone()).toBe(false)
  })
})
