import { accountLabel, formatRupees, type Account, type BalanceSnapshot } from '../../domain/models'

export function SnapshotRow({ snapshot, accounts }: { snapshot: BalanceSnapshot; accounts: Account[] }) {
  const account = accounts.find((item) => item.id === snapshot.accountId)
  const difference = snapshot.reportedBalancePaise - snapshot.calculatedBalancePaise
  return (
    <div className="snapshot-row">
      <span><b>{account ? accountLabel(account) : 'Unknown account'}</b><small>{snapshot.date} · {snapshot.source}</small></span>
      <span><small>Reported</small><strong>{formatRupees(snapshot.reportedBalancePaise)}</strong></span>
      <span><small>From transactions</small><strong>{formatRupees(snapshot.calculatedBalancePaise)}</strong></span>
      <span className={`snapshot-difference ${difference === 0 ? 'matched' : ''}`}>
        {difference === 0 ? 'Matches' : `${formatRupees(Math.abs(difference))} ${difference > 0 ? 'higher' : 'lower'}`}
      </span>
      {snapshot.notes && <small className="snapshot-note">{snapshot.notes}</small>}
    </div>
  )
}
