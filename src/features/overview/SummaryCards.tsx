import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Wallet } from 'lucide-react'
import { useFinance, useFinanceQuery } from '../../app/finance-context'
import { formatRupees, type YearSummary } from '../../domain/models'
import { monthlyNetWorth } from '../../domain/networth'
import { percentChange, savingsRate } from '../../domain/overview'
import { monthPeriod, shiftMonth } from '../../lib/period'
import { AnimatedRupees } from '../../components/AnimatedRupees'
import { Delta } from './Delta'
import { NetWorthSparkline } from './NetWorthSparkline'

export function SummaryCards({ month, summary, previous }: { month: string; summary: YearSummary; previous: YearSummary }) {
  const { accounts, deposits } = useFinance()
  const transactions = useFinanceQuery((database) => database.getAllTransactions(), [])
  const points = useMemo(
    () => monthlyNetWorth({ accounts, transactions, deposits, endMonth: month, months: 12 }),
    [accounts, transactions, deposits, month],
  )
  const latest = points[points.length - 1]
  const lastMonthEnd = points[points.length - 2]
  const netWorthChange = latest.totalPaise - lastMonthEnd.totalPaise
  const against = monthPeriod(shiftMonth(month, -1)).label.split(' ')[0]
  const saved = summary.incomePaise - summary.expensePaise
  const rate = savingsRate(summary.incomePaise, summary.expensePaise)

  return (
    <section className="metric-grid">
      <article className="metric-card has-spark">
        <NetWorthSparkline points={points} />
        <div className="metric-label"><span className="metric-icon green"><Wallet size={18} /></span> Net worth</div>
        <strong><AnimatedRupees paise={latest.totalPaise} /></strong>
        <small className={`delta ${netWorthChange >= 0 ? 'good' : 'bad'}`}>{netWorthChange >= 0 ? '▲' : '▼'} {formatRupees(Math.abs(netWorthChange))} vs {against} end</small>
      </article>
      <article className="metric-card">
        <div className="metric-label"><span className="metric-icon blue"><ArrowUpRight size={18} /></span> Income</div>
        <strong title="Transfers between your accounts are not counted as income"><AnimatedRupees paise={summary.incomePaise} /></strong>
        <Delta percent={percentChange(summary.incomePaise, previous.incomePaise)} against={against} goodWhen="up" />
      </article>
      <article className="metric-card">
        <div className="metric-label"><span className="metric-icon coral"><ArrowDownLeft size={18} /></span> Expenses</div>
        <strong><AnimatedRupees paise={summary.expensePaise} /></strong>
        <Delta percent={percentChange(summary.expensePaise, previous.expensePaise)} against={against} goodWhen="down" />
      </article>
      <article className="metric-card metric-wide">
        <div className="metric-label"><span className="metric-icon purple"><PiggyBank size={18} /></span> {saved < 0 ? 'Overspent' : 'Saved'}</div>
        <strong><AnimatedRupees paise={Math.abs(saved)} /></strong>
        <small className={`delta ${saved < 0 ? 'bad' : ''}`}>{rate === null ? 'No income recorded' : `${rate}% of income`}</small>
      </article>
    </section>
  )
}
