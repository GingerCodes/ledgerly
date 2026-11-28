// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, loadPalette, loadTheme, parsePalette, parseTheme, resolveTheme, savePalette, saveTheme } from './theme'

function fakeStorage() {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() { return data.size },
  })
}

describe('theme', () => {
  beforeEach(() => {
    fakeStorage()
    document.head.innerHTML = '<meta name="theme-color" content="#245c48">'
    delete document.documentElement.dataset.theme
  })

  it('treats anything but light and dark as "match device"', () => {
    expect(parseTheme('dark')).toBe('dark')
    expect(parseTheme('light')).toBe('light')
    expect(parseTheme('purple')).toBe('system')
    expect(parseTheme(null)).toBe('system')
  })

  it('follows the device only when asked to', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('remembers the choice, marks the page and updates the browser colour', () => {
    savePalette('classic')
    expect(loadTheme()).toBe('system')
    saveTheme('dark')
    expect(loadTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0f1613')
    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#245c48')
  })
})

describe('palette', () => {
  beforeEach(() => {
    fakeStorage()
    document.head.innerHTML = '<meta name="theme-color" content="#245c48">'
  })

  it('falls back to classic and applies palette and mode together, with the matching browser colour', () => {
    expect(parsePalette('aurora')).toBe('aurora')
    expect(parsePalette('neon')).toBeNull()
    expect(loadPalette()).toBe('aurora') // nothing saved and no account yet: a new visitor

    savePalette('aurora')
    expect(loadPalette()).toBe('aurora')
    expect(document.documentElement.dataset.palette).toBe('aurora')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#4f46e5')
    saveTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0a0919')
    savePalette('classic')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0f1613')
  })

  it('starts new accounts in Aurora and keeps older accounts in Classic until they choose', () => {
    const session = (createdAt: string) => localStorage.setItem('sb-abc-auth-token', JSON.stringify({ access_token: 'x', user: { id: 'u', created_at: createdAt } }))
    expect(loadPalette()).toBe('aurora')
    session('2026-03-01T08:00:00.123456+00:00')
    expect(loadPalette()).toBe('classic')
    session('2026-12-05T08:00:00+00:00')
    expect(loadPalette()).toBe('aurora')
    session('2026-03-01T08:00:00+00:00')
    savePalette('aurora') // an explicit choice always wins
    expect(loadPalette()).toBe('aurora')
    savePalette('classic')
    session('2027-01-01T00:00:00Z')
    expect(loadPalette()).toBe('classic')
  })
})
