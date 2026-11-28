import { useFinance } from '../../app/finance-context'
import { EmptyState } from '../../components/EmptyState'
import { formatRupees } from '../../domain/models'
import { overdueDeposits, upcomingMaturities } from '../../domain/overview'
import { todayIso } from '../../lib/dates'
import { ChevronRight } from 'lucide-react'

export function UpcomingPanel({ onNavigate }: { onNavigate: () => void }) {
  const { deposits } = useFinance()
  const today = todayIso()
  const upcoming = upcomingMaturities(deposits, today)
  const overdue = overdueDeposits(deposits, today)

  return (
    <section className="panel upcoming-panel">
      <div className="panel-heading"><div><p className="eyebrow">COMING UP</p><h2>Deposits maturing soon</h2></div><button className="text-button" onClick={onNavigate}>Fixed deposits <ChevronRight size={15} /></button></div>
      {overdue.length > 0 && <p className="upcoming-alert" role="status">{overdue.length} deposit{overdue.length === 1 ? ' is' : 's are'} past maturity and not closed yet.</p>}
      {upcoming.length ? upcoming.map(({ deposit, estimatePaise }) => (
        <div className="balance-row" key={deposit.id}>
          <span className="balance-name"><b>{deposit.institution}</b><small>Matures {deposit.maturityDate} · principal {formatRupees(deposit.principalPaise)}</small></span>
          <strong>≈ {formatRupees(estimatePaise)}</strong>
        </div>
      )) : <EmptyState>No deposits maturing in the next 90 days.</EmptyState>}
      {upcoming.length > 0 && <p className="field-hint">Estimated maturity value, not bank-confirmed.</p>}
    </section>
  )
}
