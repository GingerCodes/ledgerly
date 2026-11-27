import { useState } from 'react'
import { Download, Plus, Search } from 'lucide-react'
import { type Transaction, type TransactionInput } from '../../domain/models'
import { useFinance, useFinanceQuery } from '../../app/finance-context'
import { CURRENT_YEAR } from '../../lib/dates'
import { downloadFile } from '../../lib/format'
import { exportTransactionsCsv } from '../../data/transactions-csv'
import { EmptyState } from '../../components/EmptyState'
import { TransactionTable } from '../../components/TransactionTable'
import { TransactionForm } from './TransactionForm'

export function TransactionsPage({ year, onYearChange, transactionForm, onOpenForm, onCloseForm, onSave }: {
  year: number
  onYearChange: (year: number) => void
  /** undefined = form closed, null = new transaction, otherwise the transaction being edited. */
  transactionForm: Transaction | null | undefined
  onOpenForm: (transaction: Transaction | null) => void
  onCloseForm: () => void
  onSave: (value: TransactionInput, reason: string, keepOpen: boolean) => Promise<void>
}) {
  const { database, accounts, categories, showSuccess, showError } = useFinance()
  const [transactionSearch, setTransactionSearch] = useState('')
  const transactions = useFinanceQuery((db) => db.getTransactions(year, transactionSearch), [year, transactionSearch])

  function exportYearCsv() {
    try {
      const csv = exportTransactionsCsv(database.getTransactions(year))
      downloadFile(`transactions-${year}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      showSuccess(`${year} transactions exported. Account numbers are not included.`)
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
              {transactionForm !== undefined && <TransactionForm key={transactionForm?.id ?? 'new-transaction'} transaction={transactionForm} accounts={accounts} categories={categories} transactions={transactions} onCancel={() => onCloseForm()} onSave={onSave} />}
              <section className="panel table-panel">
                <div className="list-toolbar">
                  <div className="list-title"><h2>All transactions</h2><span className="count-pill">{transactions.length}</span></div>
                  <div className="toolbar-controls">
                    <label className="search-field"><Search size={16} /><input value={transactionSearch} onChange={(event) => setTransactionSearch(event.target.value)} placeholder="Search descriptions" /></label>
                    <select className="year-select" aria-label="Transaction year" value={year} onChange={(event) => onYearChange(Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => CURRENT_YEAR - index).map((value) => <option key={value} value={value}>{value}</option>)}</select>
                    <button className="button button-secondary" onClick={exportYearCsv}><Download size={15} /> Export {year}</button>
                  </div>
                </div>
                {transactions.length ? <TransactionTable transactions={transactions} accounts={accounts} categories={categories} onEdit={(item) => onOpenForm(item)} /> : <EmptyState>No transactions found for this year.</EmptyState>}
              </section>
            </>
  )
}
