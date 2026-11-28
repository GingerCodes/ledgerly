import type { NetWorthPoint } from '../../domain/networth'

/** Faint 12-month net worth line behind a card. Decorative: the card's text carries the numbers. */
/** Smooth curve through the points (monotone cubic), so it never swings above or below the data between two points. */
function smoothPath(pts: number[][]): string {
  const n = pts.length
  if (n < 2) return ''
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0])
  const slope = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / dx[i])
  const tangent = pts.map((_, i) => (i === 0 ? slope[0] : i === n - 1 ? slope[n - 2] : slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2))
  slope.forEach((m, i) => {
    if (m === 0) { tangent[i] = 0; tangent[i + 1] = 0; return }
    const a = tangent[i] / m
    const b = tangent[i + 1] / m
    const size = Math.hypot(a, b)
    if (size > 3) { tangent[i] = (3 * a * m) / size; tangent[i + 1] = (3 * b * m) / size }
  })
  let path = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    path += ` C${(x0 + dx[i] / 3).toFixed(1)} ${(y0 + (tangent[i] * dx[i]) / 3).toFixed(1)} ${(x1 - dx[i] / 3).toFixed(1)} ${(y1 - (tangent[i + 1] * dx[i]) / 3).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`
  }
  return path
}

export function NetWorthSparkline({ points }: { points: NetWorthPoint[] }) {
  const totals = points.map((point) => point.totalPaise)
  const low = Math.min(...totals)
  const range = Math.max(...totals) - low || 1
  const x = (index: number) => (index / Math.max(points.length - 1, 1)) * 100
  const y = (value: number) => 37 - ((value - low) / range) * 15 // stays in the lower half so it does not cross the big number
  const line = smoothPath(points.map((point, index) => [x(index), y(point.totalPaise)]))
  return (
    <svg className="sparkline" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="spark-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: 'var(--chart-1)' }} stopOpacity="0.16" /><stop offset="1" style={{ stopColor: 'var(--chart-1)' }} stopOpacity="0" /></linearGradient></defs>
      <path className="sparkline-area" d={`${line} L100 40 L0 40 Z`} />
      <path className="sparkline-line" d={line} />
    </svg>
  )
}
