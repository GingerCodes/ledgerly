import { useState, type FormEvent } from 'react'
import { accountLabel, formatRupees, parseRupeesToPaise, type Account, type FixedDeposit } from '../../domain/models'
import { amountInputValue, maskAccountNumber } from '../../lib/format'

/** Records one interest payout from a payout deposit as income in the account that received it. */
export function RecordInterestForm({ deposit, accounts, defaultDate, defaultAmountPaise, onCancel, onSave }: {
  deposit: FixedDeposit
  accounts: Account[]
  defaultDate: string
  defaultAmountPaise: number
  onCancel: () => void
  onSave: (value: { date: string; accountId: string; amountPaise: number }) => Promise<void>
}) {
  const savings = accounts.filter((account) => account.type === 'savings' && account.status === 'active')
  const [date, setDate] = useState(defaultDate)
  const [accountId, setAccountId] = useState(deposit.linkedAccountId ?? deposit.fundingAccountId ?? savings[0]?.id ?? '')
  const [amount, setAmount] = useState(amountInputValue(defaultAmountPaise))
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await onSave({ date, accountId, amountPaise: parseRupeesToPaise(amount) })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not record this interest.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form-card" onSubmit={(event) => void submit(event)}>
      <div className="form-heading">
        <div><p className="eyebrow">Record interest</p><h2>{deposit.institution} {maskAccountNumber(deposit.accountNumber)} · {formatRupees(deposit.principalPaise)}</h2></div>
        <button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button>
      </div>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="form-grid">
        <label>Received on<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label>Credited to
          <select required value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            {savings.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
          </select>
        </label>
        <label>Interest received (INR)
          <input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <span className="field-hint">Pre-filled with the expected amount. Enter what your bank actually credited.</span>
        </label>
      </div>
      <div className="form-actions"><button className="button button-primary" type="submit" disabled={saving || !accountId}>{saving ? 'Saving…' : 'Record interest'}</button></div>
    </form>
  )
}
