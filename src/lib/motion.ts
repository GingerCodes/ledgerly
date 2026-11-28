/** True when the user asked their device for less motion. Treated as true where media queries are unavailable (tests, old browsers). */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches
}
