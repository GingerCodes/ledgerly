import type { ReactNode } from 'react'

/** A ring split by `slices` (in order); `children` is shown in the middle. */
export function CategoryDonut({ slices, label, children }: { slices: Array<{ amountPaise: number; color: string }>; label: string; children?: ReactNode }) {
  const total = slices.reduce((sum, slice) => sum + slice.amountPaise, 0) || 1
  const gradient = slices.map((slice, index) => {
    const start = slices.slice(0, index).reduce((sum, other) => sum + other.amountPaise, 0)
    return `${slice.color} ${(start / total) * 100}% ${((start + slice.amountPaise) / total) * 100}%`
  }).join(', ')
  return <div className="report-donut" style={{ background: `conic-gradient(${gradient})` }} role="img" aria-label={label}><span>{children}</span></div>
}
