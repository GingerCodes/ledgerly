import { useState } from 'react'
import { BriefcaseBusiness, Check, Pencil, Plus } from 'lucide-react'
import { accountLabel, estimateFixedDepositMaturityValue, formatRupees, type FixedDeposit } from '../../domain/models'
import { useFinance } from '../../app/finance-context'
import { CURRENT_DATE } from '../../lib/dates'
import { maskAccountNumber } from '../../lib/format'
import type { FinanceDatabase } from '../../data/finance-database'
import { EmptyState } from '../../components/EmptyState'
import { DepositForm } from './DepositForm'

export function DepositsPage() {
  const { database, accounts, deposits, runAction } = useFinance()
  const [depositForm, setDepositForm] = useState<FixedDeposit | null | undefined>(undefined)

  async function createDeposit(value: Parameters<FinanceDatabase['saveFixedDeposit']>[0]) {
    await runAction(() => database.saveFixedDeposit(value), value.id ? 'Fixed deposit updated.' : 'Fixed deposit added.')
    setDepositForm(undefined)
  }

  return (
            <>
              <section className="page-heading"><div><p className="eyebrow">SAVINGS WITH A HORIZON</p><h1>Fixed deposits</h1><p className="page-subtitle">Track principal, tenure, maturity details, and estimated value.</p></div><button className="button button-primary" onClick={() => setDepositForm(null)}><Plus size={16} /> Add deposit</button></section>
              {depositForm !== undefined && <DepositForm key={depositForm?.id ?? 'new-deposit'} deposit={depositForm} accounts={accounts} onCancel={() => setDepositForm(undefined)} onSave={createDeposit} />}
              {deposits.length ? <section className="deposit-grid">{deposits.map((deposit) => {
                const matured = deposit.status === 'active' && deposit.maturityDate < CURRENT_DATE
                let estimate = ''
                try {
                  estimate = formatRupees(estimateFixedDepositMaturityValue(deposit))
                } catch (error) {
                  estimate = error instanceof Error ? `Unavailable: ${error.message}` : 'Unavailable'
                }
                return <article className="deposit-card" key={deposit.id}>
                  <div className="deposit-card-head"><span className="metric-icon purple"><BriefcaseBusiness size={18} /></span><span className={`status-pill ${deposit.status === 'closed' ? 'status-closed' : matured ? 'status-matured' : 'status-active'}`}>{deposit.status === 'closed' ? 'Closed' : matured ? 'Matured' : 'Active'}</span></div>
                  <p className="eyebrow">{deposit.institution.toUpperCase()} · {maskAccountNumber(deposit.accountNumber)}</p>
                  <h2>{formatRupees(deposit.principalPaise)}</h2>
                  <div className="deposit-details"><span>Rate <b>{(deposit.annualRateBasisPoints / 100).toFixed(2)}%</b></span><span>Matures <b>{deposit.maturityDate}</b></span>{deposit.fundingAccountId && (() => { const source = accounts.find((item) => item.id === deposit.fundingAccountId); return source && <span>Funded from <b>{accountLabel(source)}</b></span> })()}</div>
                  <div className="deposit-estimate"><small>Estimated maturity value · not bank-confirmed</small><strong>{estimate}</strong></div>
                  <div className="deposit-actions"><button className="text-button" onClick={() => setDepositForm(deposit)}><Pencil size={14} /> Edit details</button>{deposit.status === 'active' && <button className="text-button danger-text" onClick={() => void runAction(() => database.closeFixedDeposit(deposit.id), 'Deposit marked as closed.').catch(() => undefined)}><Check size={14} /> Mark closed</button>}</div>
                </article>
              })}</section> : <section className="panel"><EmptyState>No fixed deposits added yet.</EmptyState></section>}
            </>
  )
}
