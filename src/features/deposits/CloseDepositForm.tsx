import { useState, type FormEvent } from 'react'
import { accountLabel, estimateFixedDepositMaturityValue, formatRupees, parseNonNegativeRupeesToPaise, type Account, type FixedDeposit } from '../../domain/models'
import { todayIso } from '../../lib/dates'
import { amountInputValue, maskAccountNumber } from '../../lib/format'

function estimatedInterestPaise(deposit: FixedDeposit): number {
  try {
    return Math.max(0, estimateFixedDepositMaturityValue(deposit) - deposit.principalPaise)
  } catch {
    return 0
  }
}

/** Closing a deposit returns its principal to an account and records the interest received as income. */
export function CloseDepositForm({ deposit, accounts, suggestedInterestPaise, onCancel, onSave }: {
  deposit: FixedDeposit
  /** For payout deposits: interest due but not yet recorded. Other deposits use the maturity estimate. */
  suggestedInterestPaise?: number
  accounts: Account[]
  onCancel: () => void
  onSave: (value: { date: string; accountId: string; interestPaise: number }) => Promise<void>
}) {
  const savings = accounts.filter((account) => account.type === 'savings' && account.status === 'active')
  const [date, setDate] = useState(todayIso())
  const [accountId, setAccountId] = useState(deposit.linkedAccountId ?? deposit.fundingAccountId ?? savings[0]?.id ?? '')
  const [interest, setInterest] = useState(amountInputValue(suggestedInterestPaise ?? estimatedInterestPaise(deposit)))
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await onSave({ date, accountId, interestPaise: parseNonNegativeRupeesToPaise(interest) })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not close this deposit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form-card" onSubmit={(event) => void submit(event)}>
      <div className="form-heading">
        <div><p className="eyebrow">Close deposit</p><h2>{deposit.institution} {maskAccountNumber(deposit.accountNumber)} · {formatRupees(deposit.principalPaise)}</h2></div>
        <button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button>
      </div>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <p className="field-hint">
        {deposit.fundingAccountId
          ? 'The principal goes back to the account below, and the interest is recorded there as income.'
          : 'This deposit was created before funding was tracked, so its principal was never taken from an account. Only the interest is recorded.'}
      </p>
      <div className="form-grid">
        <label>Closed on<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label>Money received in
          <select required value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            {savings.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
          </select>
        </label>
        <label>Interest received (INR)
          <input required inputMode="decimal" value={interest} onChange={(event) => setInterest(event.target.value)} />
          <span className="field-hint">Pre-filled with an estimate. Enter what the bank actually paid, or 0.</span>
        </label>
      </div>
      <div className="form-actions"><button className="button button-primary" type="submit" disabled={saving || !accountId}>{saving ? 'Closing…' : 'Close deposit'}</button></div>
    </form>
  )
}
