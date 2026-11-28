import { useSyncExternalStore } from 'react'
import type { Palette } from './theme'

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette', 'data-theme'] })
  return () => observer.disconnect()
}

/** "classic:light", "aurora:dark" and so on: what is on screen right now. A string, so it compares cleanly between renders. */
const current = (): string => `${document.documentElement.dataset.palette === 'aurora' ? 'aurora' : 'classic'}:${document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'}`

/** The palette and light/dark mode that are on screen, kept up to date when they change (settings, home page, sign-in). */
export function usePalette(): { palette: Palette; mode: 'light' | 'dark' } {
  const [palette, mode] = useSyncExternalStore(subscribe, current, () => 'classic:light').split(':') as [Palette, 'light' | 'dark']
  return { palette, mode }
}
