import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type Transaction } from '../../domain/models'
import { useFinance, useFinanceQuery } from '../../app/finance-context'
import { CURRENT_HOUR, todayIso } from '../../lib/dates'
import { monthPeriod, shiftMonth } from '../../lib/period'
import type { Section } from '../../app/navigation'
import { EmptyState } from '../../components/EmptyState'
import { TransactionTable } from '../../components/TransactionTable'
import { SpendingPanel } from './SpendingPanel'
import { SummaryCards } from './SummaryCards'
import { UpcomingPanel } from './UpcomingPanel'

export function OverviewPage({ onNavigate, onEditTransaction }: {
  onNavigate: (section: Section) => void
  onEditTransaction: (transaction: Transaction | null) => void
}) {
  const { accounts, categories } = useFinance()
  const currentMonth = todayIso().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const { startDate, endDate } = monthPeriod(month)
  const previousMonth = monthPeriod(shiftMonth(month, -1))
  const summary = useFinanceQuery((database) => database.getPeriodSummary(startDate, endDate), [startDate, endDate])
  const previous = useFinanceQuery((database) => database.getPeriodSummary(previousMonth.startDate, previousMonth.endDate), [previousMonth.startDate, previousMonth.endDate])
  const recentTransactions = useFinanceQuery((database) => database.getRecentTransactions(10), [])

  return (
            <>
              <section className="page-heading">
                <div><p className="eyebrow">YOUR MONEY, CLEARLY</p><h1>Good {CURRENT_HOUR < 12 ? 'morning' : CURRENT_HOUR < 18 ? 'afternoon' : 'evening'}.</h1><p className="page-subtitle">A clear view of your finances, all in one place.</p></div>
              <div className="period-row">
                {month !== currentMonth && <button className="text-button" onClick={() => setMonth(currentMonth)}>Back to this month</button>}
                <div className="month-picker">
                  <button className="icon-button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
                  <input type="month" value={month} max={currentMonth} aria-label="Month" onChange={(event) => event.target.value && setMonth(event.target.value > currentMonth ? currentMonth : event.target.value)} />
                  <button className="icon-button" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= currentMonth} aria-label="Next month"><ChevronRight size={18} /></button>
                </div>
              </div>
              </section>
              <SummaryCards month={month} summary={summary} previous={previous} />
              <div className="dashboard-grid">
                <SpendingPanel month={month} summary={summary} previous={previous} />
                <UpcomingPanel onNavigate={() => onNavigate('deposits')} />
              </div>
              <section className="panel recent-panel">
                <div className="panel-heading"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent transactions</h2></div><button className="text-button" onClick={() => onNavigate('transactions')}>All transactions <ChevronRight size={15} /></button></div>
                {recentTransactions.length ? <TransactionTable transactions={recentTransactions} accounts={accounts} categories={categories} onEdit={(item) => onEditTransaction(item)} compact /> : <EmptyState>Your transactions will appear here.</EmptyState>}
              </section>
            </>
  )
}
