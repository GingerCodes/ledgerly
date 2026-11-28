import { useFinance, useFinanceQuery } from '../../app/finance-context'
import { CategoryDonut } from '../../components/CategoryDonut'
import { DONUT_COLORS, sliceColor } from '../../lib/chart-colors'
import { EmptyState } from '../../components/EmptyState'
import { categoryPath, formatRupees, type YearSummary } from '../../domain/models'
import { categoryMovers, spendingPace } from '../../domain/overview'
import { reportInsights } from '../../domain/reports'
import { todayIso } from '../../lib/dates'
import { monthPeriod, shiftMonth } from '../../lib/period'

export function SpendingPanel({ month, summary, previous }: { month: string; summary: YearSummary; previous: YearSummary }) {
  const { categories } = useFinance()
  const { startDate, endDate, label } = monthPeriod(month)
  const against = monthPeriod(shiftMonth(month, -1)).label.split(' ')[0]
  const transactions = useFinanceQuery((database) => database.getTransactions(startDate, endDate), [startDate, endDate])
  const movers = categoryMovers(summary.expensesByCategory, previous.expensesByCategory)
  const shown = movers.slice(0, 5)
  const otherPaise = movers.slice(5).reduce((sum, mover) => sum + mover.amountPaise, 0)
  const slices = [...shown.map((mover, index) => ({ amountPaise: mover.amountPaise, color: sliceColor(index) })), ...(otherPaise ? [{ amountPaise: otherPaise, color: DONUT_COLORS[5] }] : [])]
  const pace = spendingPace(summary.expensePaise, month, todayIso())
  const { largest } = reportInsights(transactions, startDate, endDate)
  const lastMonthTotal = previous.expensePaise

  return (
    <section className="panel spending-panel">
      <div className="panel-heading"><div><p className="eyebrow">WHERE IT GOES</p><h2>Spending · {label}</h2></div></div>
      {shown.length ? (
        <>
          <div className="spending-body">
            <CategoryDonut slices={slices} label={`Spending by category in ${label}`}>{formatRupees(summary.expensePaise)}</CategoryDonut>
            <div className="report-category-list">
              {shown.map((mover, index) => (
                <div className="report-category-row" key={mover.categoryId ?? 'none'}>
                  <span><i className="report-dot" style={{ background: sliceColor(index) }} />{categoryPath(mover.categoryId, categories)}
                    <small>{Math.round((mover.amountPaise / summary.expensePaise) * 100)}% · {mover.changePercent === null ? `new vs ${against}` : mover.changePercent === 0 ? `same as ${against}` : `${mover.changePercent > 0 ? '▲' : '▼'} ${Math.abs(mover.changePercent)}% vs ${against}`}</small>
                  </span>
                  <strong>{formatRupees(mover.amountPaise)}</strong>
                </div>
              ))}
              {otherPaise > 0 && <div className="report-category-row"><span><i className="report-dot" style={{ background: DONUT_COLORS[5] }} />Other categories</span><strong>{formatRupees(otherPaise)}</strong></div>}
            </div>
          </div>
          <dl className="spending-facts">
            <div><dt>Daily average</dt><dd>{formatRupees(pace.dailyAveragePaise)}</dd></div>
            {largest && <div><dt>Largest expense</dt><dd>{formatRupees(largest.amountPaise)} <small>{largest.description}</small></dd></div>}
            {pace.projectedPaise !== null && <div><dt>At this pace</dt><dd>{formatRupees(pace.projectedPaise)} <small>{lastMonthTotal ? `${against}: ${formatRupees(lastMonthTotal)}` : 'by month end'}</small></dd></div>}
          </dl>
        </>
      ) : <EmptyState>{`No expenses recorded in ${label}.`}</EmptyState>}
    </section>
  )
}
