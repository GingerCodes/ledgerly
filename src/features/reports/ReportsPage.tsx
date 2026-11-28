import { ChartNoAxesCombined } from 'lucide-react'
import { accountLabel, categoryPath, type Transaction } from '../../domain/models'
import { useFinance } from '../../app/finance-context'
import { ComboBox } from '../../components/ComboBox'
import { EmptyState } from '../../components/EmptyState'
import { ALL_ACCOUNTS, ALL_CATEGORIES, UNCATEGORIZED, type ExpenseReport } from './useExpenseReport'
import { ReportResults } from './ReportResults'

export function ReportsPage({ report, onEditTransaction }: {
  report: ExpenseReport
  onEditTransaction: (transaction: Transaction) => void
}) {
  const { accounts, categories } = useFinance()
  const {
    reportStartDate, setReportStartDate, reportEndDate, setReportEndDate,
    reportAccountId, setReportAccountId, reportCategoryId, setReportCategoryId, includeReportSubcategories, setIncludeReportSubcategories,
    reportFilters, reportError, generateExpenseReport,
  } = report

  return (
    <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">EXPENSE ANALYSIS</p>
                  <h1>Reports</h1>
                  <p className="page-subtitle">Summarize category spending for any date range, account and category.</p>
                </div>
              </section>
              <section className="panel report-filter-panel">
                <form onSubmit={generateExpenseReport}>
                  <div className="report-filter-grid">
                    <label>From date<input required type="date" value={reportStartDate} onChange={(event) => setReportStartDate(event.target.value)} /></label>
                    <label>To date<input required type="date" value={reportEndDate} onChange={(event) => setReportEndDate(event.target.value)} /></label>
                    <label>Account
                      <select value={reportAccountId} onChange={(event) => setReportAccountId(event.target.value)}>
                        <option value={ALL_ACCOUNTS}>All accounts</option>
                        {accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
                      </select>
                    </label>
                    <ComboBox label="Category" options={[{ id: ALL_CATEGORIES, label: 'All categories' }, { id: UNCATEGORIZED, label: 'Uncategorized' }, ...categories.map((category) => ({ id: category.id, label: categoryPath(category.id, categories) })).sort((first, second) => first.label.localeCompare(second.label))]} value={reportCategoryId} onChange={setReportCategoryId} placeholder="Search categories" />
                    <label className="report-checkbox">
                      <input
                        type="checkbox"
                        checked={includeReportSubcategories}
                        disabled={reportCategoryId === ALL_CATEGORIES || reportCategoryId === UNCATEGORIZED}
                        onChange={(event) => setIncludeReportSubcategories(event.target.checked)}
                      />
                      Include subcategories
                    </label>
                    <button className="button button-primary report-generate" type="submit"><ChartNoAxesCombined size={17} /> Generate report</button>
                  </div>
                  {reportError && <p className="form-error report-error" role="alert">{reportError}</p>}
                </form>
              </section>
              {reportFilters ? <ReportResults filters={reportFilters} report={report} onEditTransaction={onEditTransaction} /> : (
                <section className="panel report-empty"><EmptyState>Choose a period and category, then generate a report.</EmptyState></section>
              )}
              <p className="report-footnote">Reports include expenses only. Income and transfers are excluded; date boundaries are inclusive.</p>
    </>
  )
}
