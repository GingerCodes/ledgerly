import { useState, type FormEvent } from 'react'
import { parseNonNegativeRupeesToPaise, type Account } from '../../domain/models'
import { amountInputValue } from '../../lib/format'
import { todayIso } from '../../lib/dates'

export function AccountForm({
  account,
  onCancel,
  onSave,
}: {
  account: Account | null
  onCancel: () => void
  onSave: (value: { id?: string; name: string; institution: string; accountNumber: string; openingDate: string; openingBalancePaise: number }) => Promise<void>
}) {
  const [name, setName] = useState(account?.name ?? '')
  const [institution, setInstitution] = useState(account?.institution ?? '')
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? '')
  const [openingDate, setOpeningDate] = useState(account?.openingDate ?? todayIso())
  const [openingBalance, setOpeningBalance] = useState(account ? amountInputValue(account.openingBalancePaise) : '0.00')
  const [formError, setFormError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    try {
      await onSave({
        ...(account ? { id: account.id } : {}),
        name,
        institution,
        accountNumber,
        openingDate,
        openingBalancePaise: parseNonNegativeRupeesToPaise(openingBalance),
      })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this account.')
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-heading">
        <div><p className="eyebrow">Savings account</p><h2>{account ? 'Edit account' : 'Add account'}</h2></div>
        <button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button>
      </div>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="form-grid">
        <label>Account name<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Primary savings" /></label>
        <label>Bank / institution<input required maxLength={100} value={institution} onChange={(event) => setInstitution(event.target.value)} /></label>
        <label>Account number<input required maxLength={80} value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} autoComplete="off" /></label>
        <label>Opening date<input required type="date" value={openingDate} onChange={(event) => setOpeningDate(event.target.value)} /></label>
        <label>Opening balance (INR)<input required inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} /></label>
      </div>
      <div className="form-actions"><button className="button button-primary" type="submit">Save account</button></div>
    </form>
  )
}
