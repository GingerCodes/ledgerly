import { useSyncExternalStore } from 'react'
import type { Palette } from './theme'

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette'] })
  return () => observer.disconnect()
}

const current = (): Palette => (document.documentElement.dataset.palette === 'aurora' ? 'aurora' : 'classic')

/** The palette that is on screen right now, kept up to date when it changes (settings, home page, sign-in). */
export function usePalette(): Palette {
  return useSyncExternalStore(subscribe, current, () => 'classic')
}
