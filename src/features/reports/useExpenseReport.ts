import { useState, type FormEvent } from 'react'
import { categoryDescendantIds, isIsoDate } from '../../domain/models'
import { reportInsights, summarizeExpenseReport } from '../../domain/reports'
import { exportTransactionsCsv } from '../../data/transactions-csv'
import { CURRENT_DATE, CURRENT_YEAR } from '../../lib/dates'
import { downloadFile } from '../../lib/format'
import { useFinance, useFinanceQuery } from '../../app/finance-context'

export type ExpenseReportFilters = {
  startDate: string
  endDate: string
  categoryId: string | null
  includeSubcategories: boolean
}
export const ALL_CATEGORIES = 'all'
export const UNCATEGORIZED = 'uncategorized'

/** Report filter form state and the derived report; owned by the app shell so filters survive navigation. */
export function useExpenseReport() {
  const { categories, clearNotice, showSuccess, showError } = useFinance()
  const [reportStartDate, setReportStartDate] = useState(`${CURRENT_YEAR}-01-01`)
  const [reportEndDate, setReportEndDate] = useState(CURRENT_DATE)
  const [reportCategoryId, setReportCategoryId] = useState(ALL_CATEGORIES)
  const [includeReportSubcategories, setIncludeReportSubcategories] = useState(true)
  const [reportFilters, setReportFilters] = useState<ExpenseReportFilters | null>(null)
  const [reportError, setReportError] = useState('')

  const reportTransactions = useFinanceQuery((database) => reportFilters
    ? database.getExpenseReportTransactions(
      reportFilters.startDate,
      reportFilters.endDate,
      reportFilters.categoryId === null
        ? null
        : reportFilters.categoryId === UNCATEGORIZED
          ? []
          : reportFilters.includeSubcategories
            ? categoryDescendantIds(reportFilters.categoryId, database.getCategories())
            : [reportFilters.categoryId],
    )
    : [], [reportFilters])
  const reportSummary = summarizeExpenseReport(reportTransactions, categories)
  const insights = reportFilters ? reportInsights(reportTransactions, reportFilters.startDate, reportFilters.endDate) : null

  function generateExpenseReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearNotice()
    setReportError('')
    if (!isIsoDate(reportStartDate) || !isIsoDate(reportEndDate) || reportStartDate > reportEndDate) {
      setReportError('Choose valid dates with the start date on or before the end date.')
      return
    }

    setReportFilters({
      startDate: reportStartDate,
      endDate: reportEndDate,
      categoryId: reportCategoryId === ALL_CATEGORIES ? null : reportCategoryId,
      includeSubcategories: includeReportSubcategories,
    })
  }

  function exportExpenseReport() {
    if (!reportFilters) return
    try {
      const csv = exportTransactionsCsv(reportTransactions)
      downloadFile(
        `expense-report-${reportFilters.startDate}-to-${reportFilters.endDate}.csv`,
        new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      )
      showSuccess('Filtered expense report exported without account numbers.')
    } catch (error) {
      showError(error)
    }
  }

  return {
    reportStartDate, setReportStartDate, reportEndDate, setReportEndDate,
    reportCategoryId, setReportCategoryId, includeReportSubcategories, setIncludeReportSubcategories,
    reportFilters, reportError, reportTransactions, reportSummary, insights,
    generateExpenseReport, exportExpenseReport,
  }
}

export type ExpenseReport = ReturnType<typeof useExpenseReport>
