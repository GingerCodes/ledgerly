import { useEffect, useMemo, useRef, useState } from 'react'
import { useFinance, useFinanceQuery } from '../../app/finance-context'
import { EmptyState } from '../../components/EmptyState'
import { formatRupees } from '../../domain/models'
import { monthlyNetWorth } from '../../domain/networth'
import { todayIso } from '../../lib/dates'
import { formatCompactRupees } from '../../lib/format'

const HEIGHT = 220
const PAD = { left: 62, right: 14, top: 14, bottom: 28 }

function monthName(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' })
}

/** Draws the chart at the real pixel width so labels stay readable on phones. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width))))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

export function NetWorthChart() {
  const { accounts, deposits } = useFinance()
  const transactions = useFinanceQuery((database) => database.getAllTransactions(), [])
  const points = useMemo(
    () => monthlyNetWorth({ accounts, transactions, deposits, endMonth: todayIso().slice(0, 7), months: 12 }),
    [accounts, transactions, deposits],
  )
  const [ref, width] = useWidth()

  const latest = points[points.length - 1]
  const first = points[0]
  const change = latest.totalPaise - first.totalPaise
  const hasData = points.some((point) => point.totalPaise !== 0)

  const totals = points.map((point) => point.totalPaise)
  const low = Math.min(0, ...totals)
  const high = Math.max(1, ...totals)
  const innerWidth = width - PAD.left - PAD.right
  const innerHeight = HEIGHT - PAD.top - PAD.bottom
  const x = (index: number) => PAD.left + (index / (points.length - 1)) * innerWidth
  const y = (value: number) => PAD.top + (1 - (value - low) / (high - low)) * innerHeight
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)} ${y(point.totalPaise).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`
  const labelStep = width < 440 ? 3 : 2

  return (
    <section className="panel networth-panel">
      <div className="panel-heading"><div><p className="eyebrow">OVER TIME</p><h2>Net worth</h2></div></div>
      {hasData ? (
        <>
          <div className="networth-head">
            <strong>{formatRupees(latest.totalPaise)}</strong>
            <span className={`networth-change ${change >= 0 ? 'up' : 'down'}`}>
              {change >= 0 ? '▲' : '▼'} {formatRupees(Math.abs(change))} since {monthName(first.month)} {first.month.slice(0, 4)}
            </span>
          </div>
          <div className="networth-breakdown">
            <span>Cash <b>{formatRupees(latest.cashPaise)}</b></span>
            <span>Savings <b>{formatRupees(latest.savingsPaise)}</b></span>
            <span>Fixed deposits <b>{formatRupees(latest.fixedDepositsPaise)}</b></span>
          </div>
          <div ref={ref} className="networth-chart">
            <svg width={width} height={HEIGHT} role="img" aria-label={`Net worth by month over the last 12 months, now ${formatRupees(latest.totalPaise)}`}>
              <line className="networth-grid" x1={PAD.left} x2={width - PAD.right} y1={y(high)} y2={y(high)} />
              <line className="networth-grid" x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} />
              <text className="networth-axis" x={PAD.left - 8} y={y(high) + 4} textAnchor="end">{formatCompactRupees(high)}</text>
              <text className="networth-axis" x={PAD.left - 8} y={y(0) + 4} textAnchor="end">₹0</text>
              {low < 0 && <text className="networth-axis" x={PAD.left - 8} y={y(low) + 4} textAnchor="end">{formatCompactRupees(low)}</text>}
              <path className="networth-area" d={area} />
              <path className="networth-line" d={line} />
              {points.map((point, index) => (
                <g key={point.month}>
                  <circle className="networth-dot" cx={x(index)} cy={y(point.totalPaise)} r={index === points.length - 1 ? 5 : 3}>
                    <title>{`${monthName(point.month)} ${point.month.slice(0, 4)}: ${formatRupees(point.totalPaise)}`}</title>
                  </circle>
                  {(points.length - 1 - index) % labelStep === 0 && <text className="networth-axis" x={x(index)} y={HEIGHT - 8} textAnchor="middle">{monthName(point.month)}</text>}
                </g>
              ))}
            </svg>
          </div>
          <p className="field-hint">From recorded accounts, transactions and fixed-deposit principal at each month end. Not bank-confirmed; deposit interest is not included.</p>
        </>
      ) : <EmptyState>Add accounts and transactions to see your net worth over time.</EmptyState>}
    </section>
  )
}
