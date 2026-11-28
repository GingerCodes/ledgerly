import { useEffect, useRef, type ReactNode } from 'react'
import { prefersReducedMotion } from '../lib/motion'

/**
 * Brings its content into view when it appears, so a form opened from the top bar or from further down the page is
 * not left off screen. Give it a `key` that changes when a different form opens, so it scrolls again.
 */
export function ScrollIntoView({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  }, [])
  return <div ref={ref} className="scroll-target">{children}</div>
}
