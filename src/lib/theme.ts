import { prefersReducedMotion } from './motion'

/** Mode: light, dark, or follow the device. */
export type Theme = 'system' | 'light' | 'dark'
/** Palette: the set of colours, each with a light and a dark mode. */
export type Palette = 'classic' | 'aurora'

export const THEMES: Array<{ id: Theme; label: string }> = [
  { id: 'system', label: 'Match device' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export const PALETTES: Array<{ id: Palette; label: string; swatches: string[] }> = [
  { id: 'classic', label: 'Classic', swatches: ['#245c48', '#589368', '#c9a227', '#f5f7f4'] },
  { id: 'aurora', label: 'Aurora', swatches: ['#4f46e5', '#9b5cf6', '#22c9a0', '#f0568c'] },
]

const MODE_KEY = 'ledgerly-theme'
const PALETTE_KEY = 'ledgerly-palette'
// Keep in step with public/theme-init.js, which applies the same choices before the page paints.
const BROWSER_COLOR: Record<Palette, Record<'light' | 'dark', string>> = {
  classic: { light: '#245c48', dark: '#0f1613' },
  aurora: { light: '#4f46e5', dark: '#0a0919' },
}

export function parseTheme(value: unknown): Theme {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function parsePalette(value: unknown): Palette | null {
  return PALETTES.some((palette) => palette.id === value) ? (value as Palette) : null
}

/**
 * Accounts created from this moment on start in Aurora, matching the home page. Anyone who signed up earlier keeps the
 * Classic look until they choose otherwise, and an explicit choice always wins. Keep in step with public/theme-init.js.
 */
export const AURORA_FOR_ACCOUNTS_FROM = '2026-11-28T10:00:00Z'

/** When the signed-in account was created, read from the saved sign-in session (so it works before the app has loaded). */
function savedAccountCreatedAt(): string | null {
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)
      if (key && /^sb-.*-auth-token$/.test(key)) {
        const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
        return saved?.user?.created_at ?? saved?.currentSession?.user?.created_at ?? null
      }
    }
  } catch {
    // unreadable storage or session: treat as a new visitor
  }
  return null
}

export function defaultPalette(): Palette {
  const created = savedAccountCreatedAt()
  return created && Date.parse(created) < Date.parse(AURORA_FOR_ACCOUNTS_FROM) ? 'classic' : 'aurora'
}

export function resolveTheme(theme: Theme, systemPrefersDark: boolean): 'light' | 'dark' {
  return theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked: the choice applies now but will not be remembered
  }
}

/** Both choices are kept per device. */
export const loadTheme = (): Theme => parseTheme(read(MODE_KEY))
export const loadPalette = (): Palette => parsePalette(read(PALETTE_KEY)) ?? defaultPalette()

const systemQuery = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null)

const BROWSER_ICONS: Record<Palette, Record<string, string>> = {
  classic: { 'link[rel="icon"][type="image/svg+xml"]': '/favicon.svg', 'link[rel="icon"][sizes="32x32"]': '/favicon-32.png', 'link[rel="icon"][sizes="16x16"]': '/favicon-16.png', 'link[rel="apple-touch-icon"]': '/apple-touch-icon.png' },
  aurora: { 'link[rel="icon"][type="image/svg+xml"]': '/favicon-aurora.svg', 'link[rel="icon"][sizes="32x32"]': '/favicon-aurora-32.png', 'link[rel="icon"][sizes="16x16"]': '/favicon-aurora-16.png', 'link[rel="apple-touch-icon"]': '/apple-touch-icon-aurora.png' },
}

export function applyTheme(theme: Theme, palette: Palette = loadPalette()): void {
  const mode = resolveTheme(theme, systemQuery()?.matches ?? false)
  document.documentElement.dataset.theme = mode
  document.documentElement.dataset.palette = palette
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_COLOR[palette][mode])
  for (const [selector, href] of Object.entries(BROWSER_ICONS[palette])) document.querySelector(selector)?.setAttribute('href', href)
}

/** Briefly lets colours transition, so changing the theme fades instead of snapping. */
function fadeColours(): void {
  if (prefersReducedMotion()) return
  const root = document.documentElement
  root.classList.add('theme-fading')
  setTimeout(() => root.classList.remove('theme-fading'), 450)
}

export function saveTheme(theme: Theme): void {
  write(MODE_KEY, theme)
  fadeColours()
  applyTheme(theme)
}

export function savePalette(palette: Palette): void {
  write(PALETTE_KEY, palette)
  fadeColours()
  applyTheme(loadTheme(), palette)
}

/** Applies the saved choices and follows the device setting while "Match device" is chosen. */
export function initTheme(): void {
  applyTheme(loadTheme())
  systemQuery()?.addEventListener('change', () => { if (loadTheme() === 'system') applyTheme('system') })
}
