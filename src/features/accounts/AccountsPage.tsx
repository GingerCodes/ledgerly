import { useState, type FormEvent } from 'react'
import { Banknote, BriefcaseBusiness, Pencil, PiggyBank, Plus, Wallet } from 'lucide-react'
import { accountLabel, formatRupees, parseNonNegativeRupeesToPaise, type Account } from '../../domain/models'
import { useFinance } from '../../app/finance-context'
import { accountsSummary } from '../../domain/accounts-summary'
import { FixedDepositsSection } from '../deposits/FixedDepositsSection'
import { todayIso } from '../../lib/dates'
import { maskAccountNumber } from '../../lib/format'
import type { FinanceDatabase } from '../../data/finance-database'
import { AnimatedRupees } from '../../components/AnimatedRupees'
import { EmptyState } from '../../components/EmptyState'
import { ScrollIntoView } from '../../components/ScrollIntoView'
import { AccountForm } from './AccountForm'
import { SnapshotRow } from './SnapshotRow'

export function AccountsPage({ startWith }: { startWith?: 'account' | 'deposit' }) {
  const { database, accounts, deposits, snapshots, runAction, showError } = useFinance()
  const summary = accountsSummary(accounts, deposits)
  const cash = accounts.filter((account) => account.type === 'cash')
  const savings = accounts.filter((account) => account.type === 'savings')
  const [accountForm, setAccountForm] = useState<Account | null | undefined>(() => (startWith === 'account' ? null : undefined))
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
              <section className="page-heading"><div><p className="eyebrow">CASH, SAVINGS & DEPOSITS</p><h1>Accounts</h1><p className="page-subtitle">Everything you hold, in one place.</p></div></section>
              <section className="metric-grid summary-grid">
                <article className="metric-card"><div className="metric-label"><span className="metric-icon green"><PiggyBank size={18} /></span> Savings accounts</div><strong><AnimatedRupees paise={summary.savingsPaise} /></strong><small className="delta">{summary.savingsCount} account{summary.savingsCount === 1 ? '' : 's'}</small></article>
                <article className="metric-card"><div className="metric-label"><span className="metric-icon purple"><BriefcaseBusiness size={18} /></span> Fixed deposits</div><strong><AnimatedRupees paise={summary.depositsPaise} /></strong><small className="delta">{summary.depositCount} active deposit{summary.depositCount === 1 ? '' : 's'}</small></article>
                <article className="metric-card"><div className="metric-label"><span className="metric-icon blue"><Wallet size={18} /></span> Savings + deposits</div><strong><AnimatedRupees paise={summary.totalPaise} /></strong><small className="delta">Cash is shown separately below</small></article>
              </section>
              <section className="account-section">
                <div className="section-head"><div><h2>Cash</h2></div></div>
                <div className="account-card-grid">
                  {cash.map((account) => (
                  <article className="account-card" key={account.id}>
                    <div className="account-card-top"><span className={`account-type-icon ${account.type}`}><Banknote size={18} /></span>{account.id !== 'CASH' && <button className="icon-button" aria-label={`Edit ${account.name}`} onClick={() => setAccountForm(account)}><Pencil size={16} /></button>}</div>
                    <p className="eyebrow">{account.id === 'CASH' ? 'CASH WALLET' : account.institution.toUpperCase()}</p>
                    <h2>{account.name}</h2>
                    {account.id !== 'CASH' && <p className="account-number">{maskAccountNumber(account.accountNumber)}</p>}
                    <strong className="account-balance">{formatRupees(account.currentBalancePaise)}</strong>
                    <small>Opening balance {formatRupees(account.openingBalancePaise)}</small>
                  </article>
                  ))}
                </div>
              </section>
              <section className="account-section">
                <div className="section-head"><div><h2>Savings accounts</h2><p>{summary.savingsCount} account{summary.savingsCount === 1 ? '' : 's'} · {formatRupees(summary.savingsPaise)}</p></div><button className="button button-primary" onClick={() => setAccountForm(null)}><Plus size={16} /> Add savings account</button></div>
                {accountForm !== undefined && <ScrollIntoView key={accountForm?.id ?? 'new-account'}><AccountForm account={accountForm} onCancel={() => setAccountForm(undefined)} onSave={createAccount} /></ScrollIntoView>}
                {savings.length ? <div className="account-card-grid">
                  {savings.map((account) => (
                  <article className="account-card" key={account.id}>
                    <div className="account-card-top"><span className={`account-type-icon ${account.type}`}><Banknote size={18} /></span>{account.id !== 'CASH' && <button className="icon-button" aria-label={`Edit ${account.name}`} onClick={() => setAccountForm(account)}><Pencil size={16} /></button>}</div>
                    <p className="eyebrow">{account.id === 'CASH' ? 'CASH WALLET' : account.institution.toUpperCase()}</p>
                    <h2>{account.name}</h2>
                    {account.id !== 'CASH' && <p className="account-number">{maskAccountNumber(account.accountNumber)}</p>}
                    <strong className="account-balance">{formatRupees(account.currentBalancePaise)}</strong>
                    <small>Opening balance {formatRupees(account.openingBalancePaise)}</small>
                  </article>
                  ))}
                </div> : <div className="panel"><EmptyState>No savings accounts added yet.</EmptyState></div>}
              </section>
              <FixedDepositsSection startWithForm={startWith === 'deposit'} />
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
