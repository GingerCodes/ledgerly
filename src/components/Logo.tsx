import { usePalette } from '../lib/usePalette'

const LOGO_SRC = { classic: '/favicon.svg', aurora: '/favicon-aurora.svg' } as const

/** The app logo: the green coin in the Classic theme and the violet mark in Aurora. The wrapping element sets the size. */
export function Logo() {
  return <img className="logo" src={LOGO_SRC[usePalette()]} alt="" draggable={false} />
}
