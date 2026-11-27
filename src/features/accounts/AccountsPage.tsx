import { useState, type FormEvent } from 'react'
import { Banknote, Pencil, Plus } from 'lucide-react'
import { accountLabel, formatRupees, parseNonNegativeRupeesToPaise, type Account } from '../../domain/models'
import { useFinance } from '../../app/finance-context'
import { todayIso } from '../../lib/dates'
import { maskAccountNumber } from '../../lib/format'
import type { FinanceDatabase } from '../../data/finance-database'
import { AccountForm } from './AccountForm'
import { SnapshotRow } from './SnapshotRow'

export function AccountsPage() {
  const { database, accounts, snapshots, runAction, showError } = useFinance()
  const [accountForm, setAccountForm] = useState<Account | null | undefined>(undefined)
  const [snapshotBalance, setSnapshotBalance] = useState('')
  const [snapshotAccountId, setSnapshotAccountId] = useState('')
  const [snapshotDate, setSnapshotDate] = useState(todayIso())
  const [snapshotSource, setSnapshotSource] = useState('')
  const [snapshotNotes, setSnapshotNotes] = useState('')

  async function createAccount(value: Parameters<FinanceDatabase['saveAccount']>[0]) {
    await runAction(() => database.saveAccount(value), value.id ? 'Account updated.' : 'Account added.')
    setAccountForm(undefined)
  }

  async function addSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await runAction(() => database.saveBalanceSnapshot({
        accountId: snapshotAccountId,
        date: snapshotDate,
        reportedBalancePaise: parseNonNegativeRupeesToPaise(snapshotBalance),
        source: snapshotSource,
        notes: snapshotNotes,
      }), 'Balance snapshot saved.')
      setSnapshotBalance('')
      setSnapshotSource('')
      setSnapshotNotes('')
    } catch (error) {
      showError(error)
    }
  }

  return (
            <>
              <section className="page-heading"><div><p className="eyebrow">CASH & SAVINGS</p><h1>Accounts</h1><p className="page-subtitle">Your cash wallet and savings accounts, with balance check-ins.</p></div><button className="button button-primary" onClick={() => setAccountForm(null)}><Plus size={16} /> Add savings account</button></section>
              {accountForm !== undefined && <AccountForm key={accountForm?.id ?? 'new-account'} account={accountForm} onCancel={() => setAccountForm(undefined)} onSave={createAccount} />}
              <section className="account-card-grid">
                {accounts.map((account) => (
                  <article className="account-card" key={account.id}>
                    <div className="account-card-top"><span className={`account-type-icon ${account.type}`}><Banknote size={18} /></span>{account.id !== 'CASH' && <button className="icon-button" aria-label={`Edit ${account.name}`} onClick={() => setAccountForm(account)}><Pencil size={16} /></button>}</div>
                    <p className="eyebrow">{account.id === 'CASH' ? 'CASH WALLET' : account.institution.toUpperCase()}</p>
                    <h2>{account.name}</h2>
                    {account.id !== 'CASH' && <p className="account-number">{maskAccountNumber(account.accountNumber)}</p>}
                    <strong className="account-balance">{formatRupees(account.currentBalancePaise)}</strong>
                    <small>Opening balance {formatRupees(account.openingBalancePaise)}</small>
                  </article>
                ))}
              </section>
              <section className="panel snapshot-panel">
                <div className="panel-heading"><div><p className="eyebrow">RECONCILIATION</p><h2>Balance snapshots</h2><p className="panel-subtitle">Record a statement or passbook balance to compare later.</p></div></div>
                <form className="snapshot-form" onSubmit={addSnapshot}>
                  <label>Account<select required value={snapshotAccountId} onChange={(event) => setSnapshotAccountId(event.target.value)}><option value="">Select account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}</select></label>
                  <label>As of date<input required type="date" value={snapshotDate} onChange={(event) => setSnapshotDate(event.target.value)} /></label>
                  <label>Reported balance (INR)<input required inputMode="decimal" value={snapshotBalance} onChange={(event) => setSnapshotBalance(event.target.value)} placeholder="0.00" /></label>
                  <label>Source<input required value={snapshotSource} onChange={(event) => setSnapshotSource(event.target.value)} placeholder="Bank statement" /></label>
                  <button className="button button-primary" type="submit"><Plus size={15} /> Save snapshot</button>
                  <label className="snapshot-notes">Notes (optional)<input value={snapshotNotes} onChange={(event) => setSnapshotNotes(event.target.value)} /></label>
                </form>
                {snapshots.length > 0 && <div className="snapshot-list">{snapshots.slice(0, 6).map((snapshot) => <SnapshotRow key={snapshot.id} snapshot={snapshot} accounts={accounts} />)}</div>}
              </section>
            </>
  )
}
