import { useRef, useState } from 'react'
import { Download, Plus, Search, X } from 'lucide-react'
import { type Transaction, type TransactionInput } from '../../domain/models'
import { useFinance, useFinanceQuery } from '../../app/finance-context'
import { makePeriod, periodYearOptions, type Period } from '../../lib/period'
import { downloadFile } from '../../lib/format'
import { exportTransactionsCsv } from '../../data/transactions-csv'
import { EmptyState } from '../../components/EmptyState'
import { TransactionTable } from '../../components/TransactionTable'
import { TransactionForm } from './TransactionForm'

export function TransactionsPage({ period, onYearChange, transactionForm, onOpenForm, onCloseForm, onSave }: {
  period: Period
  onYearChange: (year: number) => void
  /** undefined = form closed, null = new transaction, otherwise the transaction being edited. */
  transactionForm: Transaction | null | undefined
  onOpenForm: (transaction: Transaction | null) => void
  onCloseForm: () => void
  onSave: (value: TransactionInput, reason: string, keepOpen: boolean) => Promise<void>
}) {
  const { database, accounts, categories, showSuccess, showError } = useFinance()
  const [transactionSearch, setTransactionSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const clearSearch = () => { setTransactionSearch(''); searchRef.current?.focus() }
  // Suggestions come from recent history across all periods, not just the rows on screen (a new financial year starts empty).
  const suggestions = useFinanceQuery((db) => db.getRecentTransactions(500), [])
  const transactions = useFinanceQuery((db) => db.getTransactions(period.startDate, period.endDate, transactionSearch), [period.startDate, period.endDate, transactionSearch])

  function exportYearCsv() {
    try {
      const csv = exportTransactionsCsv(database.getTransactions(period.startDate, period.endDate))
      const fileLabel = period.mode === 'financial' ? `fy${period.year}-${String(period.year + 1).slice(2)}` : String(period.year)
      downloadFile(`transactions-${fileLabel}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      showSuccess(`${period.label} transactions exported. Account numbers are not included.`)
    } catch (error) {
      showError(error)
    }
  }

  return (
            <>
              <section className="page-heading">
                <div><p className="eyebrow">DAILY MONEY MOVEMENT</p><h1>Transactions</h1><p className="page-subtitle">Track spending, income, and transfers between accounts.</p></div>
                <button className="button button-primary desktop-only" onClick={() => onOpenForm(null)}><Plus size={16} /> Add transaction</button>
              </section>
              {transactionForm !== undefined && <TransactionForm key={transactionForm?.id ?? 'new-transaction'} transaction={transactionForm} accounts={accounts} categories={categories} transactions={suggestions} onCancel={() => onCloseForm()} onSave={onSave} />}
              <section className="panel table-panel">
                <div className="list-toolbar">
                  <div className="list-title"><h2>All transactions</h2><span className="count-pill">{transactions.length}</span></div>
                  <div className="toolbar-controls">
                    <label className="search-field"><Search size={16} /><input ref={searchRef} value={transactionSearch} onChange={(event) => setTransactionSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape' && transactionSearch) { event.stopPropagation(); clearSearch() } }} placeholder="Search descriptions" aria-label="Search descriptions" />{transactionSearch && <button type="button" className="search-clear" aria-label="Clear search" onClick={clearSearch}><X size={14} /></button>}</label>
                    <select className="year-select" aria-label="Period" value={period.year} onChange={(event) => onYearChange(Number(event.target.value))}>{periodYearOptions(period.mode).map((value) => <option key={value} value={value}>{makePeriod(period.mode, value).label}</option>)}</select>
                    <button className="button button-secondary" onClick={exportYearCsv}><Download size={15} /> Export {period.label}</button>
                  </div>
                </div>
                {transactions.length ? <TransactionTable transactions={transactions} accounts={accounts} categories={categories} onEdit={(item) => onOpenForm(item)} /> : <EmptyState>No transactions found for this period.</EmptyState>}
              </section>
            </>
  )
}
