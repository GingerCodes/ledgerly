import { ChartNoAxesCombined, Download } from 'lucide-react'
import { accountLabel, categoryPath, formatRupees, type Transaction } from '../../domain/models'
import { useFinance } from '../../app/finance-context'
import { formatReportMonth } from '../../lib/dates'
import { CategoryDonut } from '../../components/CategoryDonut'
import { sliceColor } from '../../lib/chart-colors'
import { EmptyState } from '../../components/EmptyState'
import { TransactionTable } from '../../components/TransactionTable'
import { UNCATEGORIZED, type ExpenseReport, type ExpenseReportFilters } from './useExpenseReport'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function ReportResults({ filters: reportFilters, report, onEditTransaction }: {
  filters: ExpenseReportFilters
  report: ExpenseReport
  onEditTransaction: (transaction: Transaction) => void
}) {
  const { accounts, categories } = useFinance()
  const reportAccount = accounts.find((account) => account.id === reportFilters.accountId)
  const { reportSummary, insights, reportTransactions, exportExpenseReport } = report
  // Top 5 categories get their own colour; the rest are lumped into one grey slice.
  const categorySlices = reportSummary.categoryBreakdown.map((item, index) => ({ ...item, color: sliceColor(index) }))
  const weekdayTotals = insights?.weekdayTotalsPaise ?? []
  const busiestWeekday = weekdayTotals.indexOf(Math.max(...weekdayTotals, 1))
  const largestMonthlyExpense = Math.max(
    ...reportSummary.monthlyBreakdown.map((month) => month.amountPaise),
    1,
  )

  return (
                <>
                  <div className="report-result-heading">
                    <div>
                      <p className="eyebrow">GENERATED SUMMARY</p>
                      <h2>{reportFilters.startDate} – {reportFilters.endDate}</h2>
                      <p>{reportAccount ? accountLabel(reportAccount) : 'All accounts'} · {reportFilters.categoryId === null
                        ? 'All categories'
                        : reportFilters.categoryId === UNCATEGORIZED
                          ? 'Uncategorized'
                          : categoryPath(reportFilters.categoryId, categories)}
                        {reportFilters.categoryId !== null && reportFilters.categoryId !== UNCATEGORIZED && reportFilters.includeSubcategories ? ' · including subcategories' : ''}
                      </p>
                    </div>
                    <button className="button button-secondary" onClick={exportExpenseReport}><Download size={16} /> Export report CSV</button>
                  </div>
                  {insights && reportSummary.transactionCount > 0 && (
                    <section className="report-insight">
                      <ChartNoAxesCombined size={20} aria-hidden="true" />
                      <p>
                        You spent <b>{formatRupees(reportSummary.totalPaise)}</b> over {insights.days} day{insights.days === 1 ? '' : 's'} — about <b>{formatRupees(insights.dailyAveragePaise)}</b> a day.
                        {' '}<b>{categorySlices[0].categoryPath}</b> was the biggest share at {Math.round((categorySlices[0].amountPaise / reportSummary.totalPaise) * 100)}%.
                        {' '}Spending peaks on <b>{WEEKDAYS[busiestWeekday]}s</b>, and your largest expense was <b>{formatRupees(insights.largest!.amountPaise)}</b> ({insights.largest!.description}, {insights.largest!.date}).
                      </p>
                    </section>
                  )}
                  <section className="report-metrics">
                    <article className="report-metric-card"><span>Total expenses</span><strong>{formatRupees(reportSummary.totalPaise)}</strong></article>
                    <article className="report-metric-card"><span>Transactions</span><strong>{reportSummary.transactionCount.toLocaleString('en-IN')}</strong></article>
                    <article className="report-metric-card"><span>Average per transaction</span><strong>{formatRupees(reportSummary.transactionCount ? Math.round(reportSummary.totalPaise / reportSummary.transactionCount) : 0)}</strong></article>
                    <article className="report-metric-card"><span>Daily average</span><strong>{formatRupees(insights?.dailyAveragePaise ?? 0)}</strong></article>
                    <article className="report-metric-card"><span>Largest expense</span><strong>{formatRupees(insights?.largest?.amountPaise ?? 0)}</strong></article>
                  </section>
                  <div className="report-breakdown-grid">
                    <section className="panel report-breakdown">
                      <div className="panel-heading"><div><p className="eyebrow">OVER TIME</p><h2>Monthly expenses</h2></div></div>
                      {reportSummary.monthlyBreakdown.length ? (
                        <div className="report-bar-list">
                          {reportSummary.monthlyBreakdown.map((month) => {
                            const monthName = formatReportMonth(month.month)
                            return (
                              <div className="report-bar-row" key={month.month}>
                                <span className="report-bar-label">{monthName}<small>{month.transactionCount} transaction{month.transactionCount === 1 ? '' : 's'}</small></span>
                                <span className="report-bar-track" aria-hidden="true"><span style={{ width: `${(month.amountPaise / largestMonthlyExpense) * 100}%` }} /></span>
                                <strong>{formatRupees(month.amountPaise)}</strong>
                              </div>
                            )
                          })}
                        </div>
                      ) : <EmptyState>No expenses match this report.</EmptyState>}
                    </section>
                    <section className="panel report-breakdown">
                      <div className="panel-heading"><div><p className="eyebrow">CATEGORY DETAIL</p><h2>Where it went</h2></div></div>
                      {reportSummary.categoryBreakdown.length ? (
                        <>
                          <CategoryDonut slices={categorySlices} label="Share of spending by category">{formatRupees(reportSummary.totalPaise)}</CategoryDonut>
                          <div className="report-category-list">
                            {categorySlices.map((category) => (
                              <div className="report-category-row" key={category.categoryId ?? UNCATEGORIZED}>
                                <span><i className="report-dot" style={{ background: category.color }} />{category.categoryPath}<small>{category.transactionCount} transaction{category.transactionCount === 1 ? '' : 's'} · {Math.round((category.amountPaise / reportSummary.totalPaise) * 100)}%</small></span>
                                <strong>{formatRupees(category.amountPaise)}</strong>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : <EmptyState>No category totals to show.</EmptyState>}
                    </section>
                    {reportSummary.transactionCount > 0 && (
                      <section className="panel report-breakdown report-weekdays">
                        <div className="panel-heading"><div><p className="eyebrow">HABITS</p><h2>Spending by weekday</h2></div></div>
                        <div className="report-weekday-chart">
                          {weekdayTotals.map((amount, day) => (
                            <div key={day} className={day === busiestWeekday ? 'peak' : ''} title={`${WEEKDAYS[day]}: ${formatRupees(amount)}`}>
                              <span style={{ height: `${(amount / Math.max(...weekdayTotals, 1)) * 100}%` }} />
                              <small>{WEEKDAYS[day].slice(0, 3)}</small>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                  <section className="panel report-transactions">
                    <div className="panel-heading"><div><p className="eyebrow">MATCHING RECORDS</p><h2>Expense transactions</h2></div><span className="count-pill">{reportSummary.transactionCount}</span></div>
                    {reportTransactions.length
                      ? <TransactionTable
                        transactions={reportTransactions}
                        accounts={accounts}
                        categories={categories}
                        onEdit={onEditTransaction}
                      />
                      : <EmptyState>No expenses match this period and category.</EmptyState>}
                  </section>
                </>
  )
}
