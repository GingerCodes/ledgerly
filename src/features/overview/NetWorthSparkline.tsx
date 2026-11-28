import type { NetWorthPoint } from '../../domain/networth'

/** Faint 12-month net worth line behind a card. Decorative: the card's text carries the numbers. */
export function NetWorthSparkline({ points }: { points: NetWorthPoint[] }) {
  const totals = points.map((point) => point.totalPaise)
  const low = Math.min(...totals)
  const range = Math.max(...totals) - low || 1
  const x = (index: number) => (index / Math.max(points.length - 1, 1)) * 100
  const y = (value: number) => 34 - ((value - low) / range) * 26 // keeps the line inside the lower part of the card
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)} ${y(point.totalPaise).toFixed(1)}`).join(' ')
  return (
    <svg className="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path className="sparkline-area" d={`${line} L100 40 L0 40 Z`} />
      <path className="sparkline-line" d={line} />
    </svg>
  )
}
