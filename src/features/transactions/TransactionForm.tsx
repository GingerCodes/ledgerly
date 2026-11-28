import { useMemo, useRef, useState, type FormEvent } from 'react'
import { accountLabel, categoryPath, parseRupeesToPaise, type Account, type Category, type Transaction, type TransactionInput } from '../../domain/models'
import { ComboBox } from '../../components/ComboBox'
import { amountInputValue } from '../../lib/format'
import { todayIso } from '../../lib/dates'

export function TransactionForm({
  accounts,
  categories,
  transactions,
  transaction,
  onCancel,
  onSave,
}: {
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  transaction: Transaction | null
  onCancel: () => void
  onSave: (value: TransactionInput, reason: string, keepOpen: boolean) => Promise<void>
}) {
  const [type, setType] = useState<TransactionInput['type']>(transaction?.type ?? 'expense')
  const [date, setDate] = useState(transaction?.date ?? todayIso())
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [amount, setAmount] = useState(transaction ? amountInputValue(transaction.amountPaise) : '')
  const [accountId, setAccountId] = useState(transaction?.accountId ?? 'CASH')
  const [fromAccountId, setFromAccountId] = useState(transaction?.fromAccountId ?? 'CASH')
  const [toAccountId, setToAccountId] = useState(transaction?.toAccountId ?? '')
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '')
  const categoryOptions = categories
    .filter((category) => category.active || category.id === transaction?.categoryId)
    .map((category) => ({ id: category.id, label: categoryPath(category.id, categories) }))
    .sort((first, second) => first.label.localeCompare(second.label))
  const [notes, setNotes] = useState(transaction?.notes ?? '')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const descriptionRef = useRef<HTMLInputElement>(null)
  const recentDescriptions = useMemo(() => [...new Set(transactions.map((item) => item.description))].slice(0, 50), [transactions])

  // Fill the category from the latest transaction with the same description, only when the field is still empty.
  const changeDescription = (value: string) => {
    setDescription(value)
    if (type === 'transfer' || categoryId) return
    const key = value.trim().toLowerCase()
    const match = transactions
      .filter((item) => item.categoryId && item.description.trim().toLowerCase() === key)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    const option = match && categoryOptions.find((item) => item.id === match.categoryId)
    if (option) setCategoryId(option.id)
  }

  const chooseType = (nextType: TransactionInput['type']) => {
    setType(nextType)
    if (nextType !== 'transfer') {
      setFromAccountId('')
      setToAccountId('')
    } else {
      setAccountId('')
      setCategoryId('')
      setFromAccountId('CASH')
      setToAccountId(accounts.find((account) => account.id !== 'CASH')?.id ?? '')
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const keepOpen = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('name') === 'again'
    setFormError('')
    setSaving(true)
    try {
      await onSave({
        ...(transaction ? { id: transaction.id } : {}),
        date,
        type,
        accountId: type === 'transfer' ? null : accountId,
        fromAccountId: type === 'transfer' ? fromAccountId : null,
        toAccountId: type === 'transfer' ? toAccountId : null,
        description,
        amountPaise: parseRupeesToPaise(amount),
        categoryId: type === 'transfer' || !categoryId ? null : categoryId,
        notes,
      }, reason, keepOpen)
      if (keepOpen) {
        setDescription('')
        setAmount('')
        setNotes('')
        setCategoryId('')
        descriptionRef.current?.focus()
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this transaction.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form-card" onSubmit={submit} onKeyDown={(event) => { if (event.key === 'Escape') onCancel() }}>
      <div className="form-heading">
        <div>
          <p className="eyebrow">{transaction ? 'Update entry' : 'New entry'}</p>
          <h2>{transaction ? 'Edit transaction' : 'Add transaction'}</h2>
        </div>
        <button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button>
      </div>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="form-grid">
        <div className="span-two segmented-field">
          <span id="transaction-type-label">Transaction type</span>
          <div className="segmented" role="radiogroup" aria-labelledby="transaction-type-label">
            {(['expense', 'income', 'transfer'] as const).map((option) => (
              <button key={option} type="button" role="radio" aria-checked={type === option} className={type === option ? `selected ${option}` : ''} onClick={() => chooseType(option)}>
                {option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <label>
          Date
          <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label>
          Description
          <input ref={descriptionRef} list="description-options" required autoFocus={!transaction} autoComplete="off" maxLength={160} value={description} onChange={(event) => changeDescription(event.target.value)} placeholder="What was this for?" />
          <datalist id="description-options">
            {recentDescriptions.map((item) => <option key={item} value={item} />)}
          </datalist>
        </label>
        <label>
          Amount (INR)
          <input required inputMode="decimal" autoComplete="off" pattern="[0-9]*\.?[0-9]{0,2}" title="Numbers only, up to 2 decimals (e.g. 250 or 99.50)" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
        </label>
        {type === 'transfer' ? (
          <>
            <label>
              From account
              <select required value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)}>
                <option value="">Select account</option>
                {accounts.filter((account) => account.status === 'active').map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
              </select>
            </label>
            <label>
              To account
              <select required value={toAccountId} onChange={(event) => setToAccountId(event.target.value)}>
                <option value="">Select account</option>
                {accounts.filter((account) => account.status === 'active').map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
              </select>
            </label>
          </>
        ) : (
          <label>
            Account
            <select
              required
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              {accounts.filter((account) => account.status === 'active').map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
            </select>
          </label>
        )}
        {type !== 'transfer' && (
          <ComboBox label="Category" options={[{ id: '', label: 'Uncategorized' }, ...categoryOptions]} value={categoryId} onChange={setCategoryId} placeholder="Search categories" />
        )}
        <label className="span-two">
          Notes
          <textarea rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        {transaction && (
          <label className="span-two">
            Edit note (optional)
            <input maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why was this changed?" />
          </label>
        )}
      </div>
      <div className="form-actions form-actions-reverse">
        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? 'Saving…' : transaction ? 'Save changes' : 'Add transaction'}
        </button>
        {!transaction && <button className="button button-secondary" disabled={saving} type="submit" name="again">Save &amp; add another</button>}
      </div>
    </form>
  )
}
