import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from './motion'

/**
 * A number that eases from where it was to `target` (from 0 the first time), so figures count up when a screen opens
 * and when the month changes. Returns the target at once when the user prefers reduced motion.
 */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
  const from = useRef(value)
  const shown = useRef(value)

  useEffect(() => {
    if (prefersReducedMotion() || from.current === target) {
      shown.current = target
      from.current = target
      const frame = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(frame)
    }
    const start = performance.now()
    const origin = shown.current
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - progress) ** 3
      shown.current = Math.round(origin + (target - origin) * eased)
      setValue(shown.current)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else from.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}
