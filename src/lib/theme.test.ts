// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, loadPalette, loadTheme, parsePalette, parseTheme, resolveTheme, savePalette, saveTheme } from './theme'

function fakeStorage() {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) })
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
    expect(parsePalette('neon')).toBe('classic')
    expect(loadPalette()).toBe('classic')

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
})
