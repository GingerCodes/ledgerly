import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../lib/motion'

/**
 * Lets sections fade in as they scroll into view. Everything stays visible when there is no IntersectionObserver or the
 * user prefers reduced motion: the hiding class is only added once we know the reveal will run.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const container = ref.current
    if (!container || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return
    const targets = container.querySelectorAll('.reveal')
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
          observer.unobserve(entry.target)
        }
      }
    }, { threshold: 0.12 })
    container.classList.add('reveal-ready')
    targets.forEach((target) => observer.observe(target))
    return () => {
      observer.disconnect()
      container.classList.remove('reveal-ready')
    }
  }, [])
  return ref
}
