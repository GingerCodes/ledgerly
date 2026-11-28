export type Theme = 'system' | 'light' | 'dark'

export const THEMES: Array<{ id: Theme; label: string }> = [
  { id: 'system', label: 'Match device' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

const STORAGE_KEY = 'ledgerly-theme'
// Keep in step with public/theme-init.js, which applies the same choice before the page paints.
const BROWSER_COLOR = { light: '#245c48', dark: '#0f1613' }

export function parseTheme(value: unknown): Theme {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function resolveTheme(theme: Theme, systemPrefersDark: boolean): 'light' | 'dark' {
  return theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme
}

/** The choice is kept per device. */
export function loadTheme(): Theme {
  try {
    return parseTheme(localStorage.getItem(STORAGE_KEY))
  } catch {
    return 'system'
  }
}

const systemQuery = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null)

export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme, systemQuery()?.matches ?? false)
  document.documentElement.dataset.theme = resolved
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_COLOR[resolved])
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // storage blocked: the choice applies now but will not be remembered
  }
  applyTheme(theme)
}

/** Applies the saved theme and follows the device setting while "Match device" is chosen. */
export function initTheme(): void {
  applyTheme(loadTheme())
  systemQuery()?.addEventListener('change', () => { if (loadTheme() === 'system') applyTheme('system') })
}
