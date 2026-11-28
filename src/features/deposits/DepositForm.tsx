import { useState, type FormEvent } from 'react'
import { accountLabel, estimateFixedDepositMaturityValue, formatRupees, isIsoDate, parseRupeesToPaise, type Account, type FixedDeposit, type FixedDepositInput } from '../../domain/models'
import { amountInputValue } from '../../lib/format'
import { todayIso } from '../../lib/dates'

export function DepositForm({
  deposit,
  accounts,
  onCancel,
  onSave,
}: {
  deposit: FixedDeposit | null
  accounts: Account[]
  onCancel: () => void
  onSave: (value: FixedDepositInput) => Promise<void>
}) {
  const [institution, setInstitution] = useState(deposit?.institution ?? '')
  const [accountNumber, setAccountNumber] = useState(deposit?.accountNumber ?? '')
  const [principal, setPrincipal] = useState(deposit ? amountInputValue(deposit.principalPaise) : '')
  const [startDate, setStartDate] = useState(deposit?.startDate ?? todayIso())
  const [maturityDate, setMaturityDate] = useState(deposit?.maturityDate ?? '')
  const [rate, setRate] = useState(deposit ? (deposit.annualRateBasisPoints / 100).toFixed(2) : '')
  const [interestType, setInterestType] = useState<FixedDeposit['interestType']>(deposit?.interestType ?? 'compound')
  const [compoundsPerYear, setCompoundsPerYear] = useState(String(deposit?.compoundsPerYear ?? 4))
  const [linkedAccountId, setLinkedAccountId] = useState(deposit?.linkedAccountId ?? '')
  const [fundingAccountId, setFundingAccountId] = useState(deposit?.fundingAccountId ?? '')
  const [maturityInstruction, setMaturityInstruction] = useState(deposit?.maturityInstruction ?? '')
  const [notes, setNotes] = useState(deposit?.notes ?? '')
  const [formError, setFormError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    try {
      if (!/^\d+(?:\.\d{1,2})?$/.test(rate.trim())) throw new Error('Enter an annual rate with up to two decimal places.')
      const annualRateBasisPoints = Math.round(Number(rate) * 100)
      const compounding = Number(compoundsPerYear)
      const principalPaise = parseRupeesToPaise(principal)
      if (!isIsoDate(startDate) || !isIsoDate(maturityDate) || maturityDate < startDate) {
        throw new Error('Enter valid FD dates; maturity cannot be before the start date.')
      }
      if (!Number.isSafeInteger(compounding)) throw new Error('Compounding periods must be a whole number.')
      estimateFixedDepositMaturityValue({
        id: deposit?.id ?? 'new-deposit',
        institution,
        accountNumber,
        principalPaise,
        startDate,
        maturityDate,
        annualRateBasisPoints,
        interestType,
        compoundsPerYear: compounding,
        linkedAccountId: linkedAccountId || null,
        fundingAccountId: fundingAccountId || null,
        maturityInstruction,
        status: deposit?.status ?? 'active',
        closedDate: deposit?.closedDate ?? null,
        notes,
        createdAt: deposit?.createdAt ?? '',
        updatedAt: deposit?.updatedAt ?? '',
      })
      await onSave({
        ...(deposit ? { id: deposit.id } : {}),
        institution,
        accountNumber,
        principalPaise,
        startDate,
        maturityDate,
        annualRateBasisPoints,
        interestType,
        compoundsPerYear: compounding,
        linkedAccountId: linkedAccountId || null,
        fundingAccountId: fundingAccountId || null,
        maturityInstruction,
        notes,
      })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this fixed deposit.')
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-heading">
        <div><p className="eyebrow">Deposit details</p><h2>{deposit ? 'Edit fixed deposit' : 'Add fixed deposit'}</h2></div>
        <button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button>
      </div>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="form-grid">
        <label>Bank / institution<input required maxLength={100} value={institution} onChange={(event) => setInstitution(event.target.value)} /></label>
        <label>FD account / reference number<input required maxLength={80} value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} autoComplete="off" /></label>
        <label>Principal (INR)<input required inputMode="decimal" value={principal} onChange={(event) => setPrincipal(event.target.value)} /></label>
        <label>Annual interest rate (%)<input required inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="7.25" /></label>
        <label>Start date<input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label>Maturity date<input required type="date" value={maturityDate} onChange={(event) => setMaturityDate(event.target.value)} /></label>
        <label>Interest calculation
          <select value={interestType} onChange={(event) => setInterestType(event.target.value as FixedDeposit['interestType'])}>
            <option value="compound">Compound interest</option><option value="simple">Simple interest</option>
          </select>
        </label>
        {interestType === 'compound' && <label>Compounds per year<input required min={1} max={365} type="number" value={compoundsPerYear} onChange={(event) => setCompoundsPerYear(event.target.value)} /></label>}
        <label>Funded from (savings account)
          <select required={!deposit} value={fundingAccountId} onChange={(event) => setFundingAccountId(event.target.value)}>
            <option value="">{deposit ? 'Not tracked' : 'Select account'}</option>
            {accounts.filter((account) => account.type === 'savings' && (account.status === 'active' || account.id === deposit?.fundingAccountId)).map((account) => <option key={account.id} value={account.id}>{accountLabel(account)} — {formatRupees(account.currentBalancePaise)}</option>)}
          </select>
          <span className="field-hint">The principal is debited from this account.</span>
        </label>
        <label>Linked maturity account
          <select value={linkedAccountId} onChange={(event) => setLinkedAccountId(event.target.value)}>
            <option value="">Not specified</option>
            {accounts.filter((account) => account.type === 'savings').map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
          </select>
        </label>
        <label>Maturity instruction<input maxLength={200} value={maturityInstruction} onChange={(event) => setMaturityInstruction(event.target.value)} placeholder="Renew principal; credit interest" /></label>
        <label className="span-two">Notes<textarea rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      </div>
      <div className="form-actions"><button className="button button-primary" type="submit">Save deposit</button></div>
    </form>
  )
}
