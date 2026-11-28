import { usePalette } from '../lib/usePalette'

const LOGO_SRC = {
  classic: { light: '/favicon.svg', dark: '/favicon.svg' },
  aurora: { light: '/favicon-aurora-light.svg', dark: '/favicon-aurora-dark.svg' },
} as const

/**
 * The app logo: the green coin in the Classic theme; in Aurora the same coin in violet, brighter in light mode and
 * deeper in dark mode. The wrapping element sets the size.
 */
export function Logo() {
  const { palette, mode } = usePalette()
  return <img className="logo" src={LOGO_SRC[palette][mode]} alt="" draggable={false} />
}
