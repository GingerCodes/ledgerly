import { ArrowDownLeft, ArrowUpRight, Banknote, BriefcaseBusiness, ChevronRight, Plus, Wallet } from 'lucide-react'
import { categoryPath, formatRupees, type Transaction } from '../../domain/models'
import { useFinance, useFinanceQuery } from '../../app/finance-context'
import { CURRENT_HOUR, CURRENT_YEAR } from '../../lib/dates'
import { maskAccountNumber } from '../../lib/format'
import type { Section } from '../../app/navigation'
import { EmptyState } from '../../components/EmptyState'
import { TransactionTable } from '../../components/TransactionTable'

export function OverviewPage({ year, onYearChange, onNavigate, onEditTransaction }: {
  year: number
  onYearChange: (year: number) => void
  onNavigate: (section: Section) => void
  onEditTransaction: (transaction: Transaction | null) => void
}) {
  const { accounts, categories, deposits } = useFinance()
  const summary = useFinanceQuery((database) => database.getYearSummary(year), [year])
  const recentTransactions = useFinanceQuery((database) => database.getTransactions(CURRENT_YEAR).slice(0, 5), [])
  const spendingCategories = summary.expensesByCategory
    .map((item) => ({ ...item, label: categoryPath(item.categoryId, categories) }))
    .sort((left, right) => right.amountPaise - left.amountPaise)

  return (
            <>
              <section className="page-heading">
                <div><p className="eyebrow">YOUR MONEY, CLEARLY</p><h1>Good {CURRENT_HOUR < 12 ? 'morning' : CURRENT_HOUR < 18 ? 'afternoon' : 'evening'}.</h1><p className="page-subtitle">A clear view of your finances, all in one place.</p></div>
                <button className="button button-primary desktop-only" onClick={() => onEditTransaction(null)}><Plus size={16} /> New transaction</button>
              </section>
              <section className="metric-grid">
                <article className="metric-card"><div className="metric-label"><span className="metric-icon green"><Wallet size={18} /></span> Cash + savings</div><strong>{formatRupees(accounts.reduce((total, account) => total + account.currentBalancePaise, 0))}</strong><small>Across {accounts.length} accounts</small></article>
                <article className="metric-card"><div className="metric-label"><span className="metric-icon coral"><ArrowDownLeft size={18} /></span> Expenses · {year}</div><strong>{formatRupees(summary?.expensePaise ?? 0)}</strong><small>{summary?.transactionCount ?? 0} transactions this year</small></article>
                <article className="metric-card"><div className="metric-label"><span className="metric-icon blue"><ArrowUpRight size={18} /></span> Income · {year}</div><strong>{formatRupees(summary?.incomePaise ?? 0)}</strong><small>Transfers are excluded from income</small></article>
                <article className="metric-card"><div className="metric-label"><span className="metric-icon purple"><BriefcaseBusiness size={18} /></span> Fixed deposits</div><strong>{formatRupees(deposits.filter((deposit) => deposit.status === 'active').reduce((total, deposit) => total + deposit.principalPaise, 0))}</strong><small>{deposits.filter((deposit) => deposit.status === 'active').length} active deposits</small></article>
              </section>
              <div className="dashboard-grid">
                <section className="panel account-panel">
                  <div className="panel-heading"><div><p className="eyebrow">YOUR ACCOUNTS</p><h2>Balances</h2></div><button className="text-button" onClick={() => onNavigate('accounts')}>View accounts <ChevronRight size={15} /></button></div>
                  {accounts.length ? accounts.map((account) => (
                    <div className="balance-row" key={account.id}><span className={`account-type-icon ${account.type}`}><Banknote size={17} /></span><span className="balance-name"><b>{account.name}</b><small>{account.id === 'CASH' ? 'Cash account' : `${account.institution} · ${maskAccountNumber(account.accountNumber)}`}</small></span><strong>{formatRupees(account.currentBalancePaise)}</strong></div>
                  )) : <EmptyState>No accounts added.</EmptyState>}
                </section>
                <section className="panel spending-panel">
                  <div className="panel-heading"><div><p className="eyebrow">WHERE IT GOES</p><h2>Top spending · {year}</h2></div><button className="year-chip" onClick={() => onYearChange(year - 1)} aria-label="Show previous year">{year}</button></div>
                  {spendingCategories.length ? spendingCategories.slice(0, 5).map((item, index) => {
                    const percent = summary?.expensePaise ? (item.amountPaise / summary.expensePaise) * 100 : 0
                    return <div className="spending-item" key={`${item.categoryId ?? 'none'}-${index}`}><div className="spending-copy"><span>{item.label}</span><b>{formatRupees(item.amountPaise)}</b></div><div className="progress-track"><span style={{ width: `${Math.min(percent, 100)}%` }} /></div></div>
                  }) : <EmptyState>No expense categories yet.</EmptyState>}
                </section>
              </div>
              <section className="panel recent-panel">
                <div className="panel-heading"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent transactions</h2></div><button className="text-button" onClick={() => onNavigate('transactions')}>All transactions <ChevronRight size={15} /></button></div>
                {recentTransactions.length ? <TransactionTable transactions={recentTransactions} accounts={accounts} categories={categories} onEdit={(item) => onEditTransaction(item)} compact /> : <EmptyState>Your transactions will appear here.</EmptyState>}
              </section>
            </>
  )
}
