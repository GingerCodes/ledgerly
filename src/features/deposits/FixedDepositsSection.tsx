import { useState } from 'react'
import { BriefcaseBusiness, Check, Coins, Pencil, Plus } from 'lucide-react'
import { accountLabel, closedDateOf, estimateFixedDepositMaturityValue, formatRupees, interestFrequencyLabel, type FixedDeposit } from '../../domain/models'
import { fdPayoutSummary, payoutDescription } from '../../domain/fd-payouts'
import { useFinance, useFinanceQuery } from '../../app/finance-context'
import { CURRENT_DATE } from '../../lib/dates'
import { maskAccountNumber } from '../../lib/format'
import type { FinanceDatabase } from '../../data/finance-database'
import { EmptyState } from '../../components/EmptyState'
import { ScrollIntoView } from '../../components/ScrollIntoView'
import { CloseDepositForm } from './CloseDepositForm'
import { DepositForm } from './DepositForm'
import { RecordInterestForm } from './RecordInterestForm'

export function FixedDepositsSection({ startWithForm = false }: { startWithForm?: boolean }) {
  const { database, accounts, deposits, runAction } = useFinance()
  const [depositForm, setDepositForm] = useState<FixedDeposit | null | undefined>(() => (startWithForm ? null : undefined))
  const [closing, setClosing] = useState<FixedDeposit | null>(null)
  const [recording, setRecording] = useState<FixedDeposit | null>(null)
  const transactions = useFinanceQuery((database) => database.getAllTransactions(), [])

  async function recordInterest(deposit: FixedDeposit, value: { date: string; accountId: string; amountPaise: number }) {
    await runAction(() => database.saveTransaction({
      type: 'income', date: value.date, accountId: value.accountId, fromAccountId: null, toAccountId: null,
      description: payoutDescription(deposit), amountPaise: value.amountPaise, categoryId: null, notes: '',
    }), 'Interest recorded.')
    setRecording(null)
  }

  async function closeDeposit(deposit: FixedDeposit, value: Parameters<FinanceDatabase['closeFixedDeposit']>[1]) {
    await runAction(() => database.closeFixedDeposit(deposit.id, value), 'Deposit closed.')
    setClosing(null)
  }

  async function createDeposit(value: Parameters<FinanceDatabase['saveFixedDeposit']>[0]) {
    await runAction(() => database.saveFixedDeposit(value), value.id ? 'Fixed deposit updated.' : 'Fixed deposit added.')
    setDepositForm(undefined)
  }

  const open = deposits.filter((deposit) => deposit.status !== 'closed')
  const openCount = open.length
  const openPaise = open.reduce((sum, deposit) => sum + deposit.principalPaise, 0)

  return (
            <section className="account-section">
              <div className="section-head"><div><h2>Fixed deposits</h2><p>{openCount} active · {formatRupees(openPaise)}</p></div><button className="button button-primary" onClick={() => setDepositForm(null)}><Plus size={16} /> Add deposit</button></div>
              {depositForm !== undefined && <ScrollIntoView key={depositForm?.id ?? 'new-deposit'}><DepositForm deposit={depositForm} accounts={accounts} onCancel={() => setDepositForm(undefined)} onSave={createDeposit} /></ScrollIntoView>}
              {recording && (() => {
                const next = fdPayoutSummary(recording, CURRENT_DATE, transactions)
                return <ScrollIntoView key={recording.id}><RecordInterestForm deposit={recording} accounts={accounts} defaultDate={next.due[0]?.dueDate ?? CURRENT_DATE} defaultAmountPaise={next.due[0]?.amountPaise ?? next.perPayoutPaise} onCancel={() => setRecording(null)} onSave={(value) => recordInterest(recording, value)} /></ScrollIntoView>
              })()}
              {closing && <ScrollIntoView key={closing.id}><CloseDepositForm deposit={closing} suggestedInterestPaise={closing.interestType === 'payout' ? fdPayoutSummary(closing, CURRENT_DATE, transactions).due.reduce((sum, item) => sum + item.amountPaise, 0) : undefined} accounts={accounts} onCancel={() => setClosing(null)} onSave={(value) => closeDeposit(closing, value)} /></ScrollIntoView>}
              {deposits.length ? <section className="deposit-grid">{deposits.map((deposit) => {
                const matured = deposit.status === 'active' && deposit.maturityDate < CURRENT_DATE
                let estimate = ''
                try {
                  estimate = formatRupees(estimateFixedDepositMaturityValue(deposit))
                } catch (error) {
                  estimate = error instanceof Error ? `Unavailable: ${error.message}` : 'Unavailable'
                }
                const payout = deposit.interestType === 'payout' ? fdPayoutSummary(deposit, CURRENT_DATE, transactions) : null
                return <article className="deposit-card" key={deposit.id}>
                  <div className="deposit-card-head"><span className="metric-icon purple"><BriefcaseBusiness size={18} /></span><span className={`status-pill ${deposit.status === 'closed' ? 'status-closed' : matured ? 'status-matured' : 'status-active'}`}>{deposit.status === 'closed' ? 'Closed' : matured ? 'Matured' : 'Active'}</span></div>
                  <p className="eyebrow">{deposit.institution.toUpperCase()} · {maskAccountNumber(deposit.accountNumber)}</p>
                  <h2>{formatRupees(deposit.principalPaise)}</h2>
                  <div className="deposit-details"><span>Rate <b>{(deposit.annualRateBasisPoints / 100).toFixed(2)}%</b></span><span>Matures <b>{deposit.maturityDate}</b></span>{deposit.status === 'closed' && <span>Closed <b>{closedDateOf(deposit)}</b></span>}{!deposit.fundingAccountId && <span>Funded from <b>Not tracked</b></span>}{deposit.fundingAccountId && (() => { const source = accounts.find((item) => item.id === deposit.fundingAccountId); return source && <span>Funded from <b>{accountLabel(source)}</b></span> })()}</div>
                  {payout && <div className="deposit-details"><span>Interest <b>≈ {formatRupees(payout.perPayoutPaise)} {interestFrequencyLabel(deposit.compoundsPerYear).toLowerCase()}</b></span><span>Received so far <b>{formatRupees(payout.receivedPaise)}</b></span>{deposit.status !== 'closed' && payout.next && <span>Next payout <b>{payout.next.dueDate}</b></span>}</div>}
                  {payout && payout.due.length > 0 && deposit.status !== 'closed' && <p className="upcoming-alert" role="status">{payout.due.length} interest payout{payout.due.length === 1 ? '' : 's'} due and not recorded yet.</p>}
                  <div className="deposit-estimate"><small>{payout ? 'Returned at maturity · interest paid out' : 'Estimated maturity value · not bank-confirmed'}</small><strong>{estimate}</strong></div>
                  <div className="deposit-actions">{payout && deposit.status === 'active' && <button className="text-button" onClick={() => { setDepositForm(undefined); setClosing(null); setRecording(deposit) }}><Coins size={14} /> Record interest</button>}<button className="text-button" onClick={() => setDepositForm(deposit)}><Pencil size={14} /> Edit details</button>{deposit.status === 'active' && <button className="text-button danger-text" onClick={() => { setDepositForm(undefined); setRecording(null); setClosing(deposit) }}><Check size={14} /> Close deposit</button>}</div>
                </article>
              })}</section> : <div className="panel"><EmptyState>No fixed deposits added yet.</EmptyState></div>}
            </section>
  )
}
