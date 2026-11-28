import { useFinance, useFinanceQuery } from '../../app/finance-context'
import { payoutsToRecord } from '../../domain/fd-payouts'
import { accountLabel, formatRupees } from '../../domain/models'
import { overdueDeposits, upcomingMaturities } from '../../domain/overview'
import { todayIso } from '../../lib/dates'
import { ChevronRight } from 'lucide-react'

const SAVINGS_SHOWN = 5

export function UpcomingPanel({ onNavigate }: { onNavigate: () => void }) {
  const { accounts, deposits } = useFinance()
  const today = todayIso()
  const upcoming = upcomingMaturities(deposits, today)
  const overdue = overdueDeposits(deposits, today)
  const transactions = useFinanceQuery((database) => database.getAllTransactions(), [])
  const toRecord = payoutsToRecord(deposits, today, transactions)
  const savings = accounts.filter((account) => account.type === 'savings' && account.status === 'active').sort((a, b) => b.currentBalancePaise - a.currentBalancePaise)
  const shownSavings = savings.slice(0, SAVINGS_SHOWN)

  return (
    <section className="panel upcoming-panel">
      <div className="panel-heading"><div><p className="eyebrow">COMING UP</p><h2>Savings &amp; deposits</h2></div><button className="text-button" onClick={onNavigate}>Accounts <ChevronRight size={15} /></button></div>
      {overdue.length > 0 && <p className="upcoming-alert" role="status">{overdue.length} deposit{overdue.length === 1 ? ' is' : 's are'} past maturity and not closed yet.</p>}
      {toRecord > 0 && <p className="upcoming-alert" role="status">{toRecord} interest payout{toRecord === 1 ? '' : 's'} to record on your fixed deposits.</p>}
      {upcoming.length ? upcoming.map(({ deposit, estimatePaise }) => (
        <div className="balance-row" key={deposit.id}>
          <span className="balance-name"><b>{deposit.institution}</b><small>Matures {deposit.maturityDate} · principal {formatRupees(deposit.principalPaise)}</small></span>
          <strong>≈ {formatRupees(estimatePaise)}</strong>
        </div>
      )) : <p className="upcoming-none">No deposits maturing in the next 90 days.</p>}
      {upcoming.length > 0 && <p className="field-hint">Estimated maturity value, not bank-confirmed.</p>}
      {shownSavings.length > 0 && (
        <>
          <h3 className="upcoming-group">Savings accounts</h3>
          {shownSavings.map((account) => (
            <div className="balance-row saving-row" key={account.id}>
              <span className="balance-name"><b>{accountLabel(account)}</b></span>
              <strong>{formatRupees(account.currentBalancePaise)}</strong>
            </div>
          ))}
          {savings.length > shownSavings.length && <button className="text-button upcoming-more" onClick={onNavigate}>+{savings.length - shownSavings.length} more</button>}
        </>
      )}
    </section>
  )
}
