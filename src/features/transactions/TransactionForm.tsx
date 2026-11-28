import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { accountLabel, categoryPath, parseRupeesToPaise, type Account, type Category, type Transaction, type TransactionInput } from '../../domain/models'
import { categoryForDescription, defaultAccountId, topCategoryIds } from '../../domain/transaction-suggestions'
import { ChoiceChips } from '../../components/ChoiceChips'
import { ComboBox } from '../../components/ComboBox'
import { SegmentedControl, type SegmentedOption } from '../../components/SegmentedControl'
import { amountInputValue } from '../../lib/format'
import { shiftIsoDate, todayIso } from '../../lib/dates'

const TYPE_OPTIONS: Array<SegmentedOption<TransactionInput['type']>> = [
  { value: 'expense', label: 'Expense', tone: 'expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
]
const CATEGORY_CHIPS = 5
/** With more accounts than this the chips would wrap into a wall, so the account falls back to a dropdown. */
const MAX_ACCOUNT_CHIPS = 4

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
  const initialAccount = useMemo(() => defaultAccountId(transactions, accounts), [transactions, accounts])
  const [type, setType] = useState<TransactionInput['type']>(transaction?.type ?? 'expense')
  const [date, setDate] = useState(transaction?.date ?? todayIso())
  const [pickingDate, setPickingDate] = useState(false)
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [amount, setAmount] = useState(transaction ? amountInputValue(transaction.amountPaise) : '')
  const [accountId, setAccountId] = useState(transaction ? transaction.accountId ?? '' : initialAccount)
  const [fromAccountId, setFromAccountId] = useState(transaction?.fromAccountId ?? initialAccount)
  const [toAccountId, setToAccountId] = useState(transaction?.toAccountId ?? '')
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '')
  const [moreCategories, setMoreCategories] = useState(false)
  const [notes, setNotes] = useState(transaction?.notes ?? '')
  const [showNote, setShowNote] = useState(Boolean(transaction?.notes))
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  const categoryOptions = categories
    .filter((category) => category.active || category.id === transaction?.categoryId)
    .map((category) => ({ id: category.id, label: categoryPath(category.id, categories) }))
    .sort((first, second) => first.label.localeCompare(second.label))
  const labelOf = new Map(categoryOptions.map((option) => [option.id, option.label]))
  const topIds = topCategoryIds(transactions, type, new Set(labelOf.keys()), CATEGORY_CHIPS)
  // A category picked through "More…" (or the one being edited) is shown as a chip too, so the choice stays visible.
  const chipIds = categoryId && !topIds.includes(categoryId) && labelOf.has(categoryId) ? [...topIds, categoryId] : topIds
  const categoryChips = chipIds.map((id) => ({ id, label: labelOf.get(id) ?? '' }))
  const recentDescriptions = useMemo(() => [...new Set(transactions.map((item) => item.description))].slice(0, 50), [transactions])
  const activeAccounts = accounts.filter((account) => account.status === 'active' || account.id === transaction?.accountId || account.id === transaction?.fromAccountId || account.id === transaction?.toAccountId)
  const accountChips = activeAccounts.map((account) => ({ id: account.id, label: accountLabel(account) }))
  const today = todayIso()
  const yesterday = shiftIsoDate(today, -1)
  const dateChoice = pickingDate ? 'other' : date === today ? 'today' : date === yesterday ? 'yesterday' : 'other'

  // Fill the category from the latest transaction with the same description, only when the field is still empty.
  const changeDescription = (value: string) => {
    setDescription(value)
    if (type === 'transfer' || categoryId) return
    const match = categoryForDescription(transactions, value)
    if (match && labelOf.has(match)) setCategoryId(match)
  }

  const chooseType = (nextType: TransactionInput['type']) => {
    setType(nextType)
    if (nextType !== 'transfer') {
      setAccountId(accountId || initialAccount)
      setFromAccountId('')
      setToAccountId('')
    } else {
      setAccountId('')
      setCategoryId('')
      setFromAccountId(accountId || initialAccount)
      setToAccountId(accounts.find((account) => account.status === 'active' && account.id !== (accountId || initialAccount))?.id ?? '')
    }
  }

  const chooseDate = (choice: string) => {
    if (choice === 'other') { setPickingDate(true); return }
    setPickingDate(false)
    setDate(choice === 'today' ? today : yesterday)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const keepOpen = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('name') === 'again'
    setFormError('')
    if (type !== 'transfer' && !accountId) { setFormError('Choose the account for this transaction.'); return }
    setSaving(true)
    try {
      await onSave({
        ...(transaction ? { id: transaction.id } : {}),
        date,
        type,
        accountId: type === 'transfer' ? null : accountId,
        fromAccountId: type === 'transfer' ? fromAccountId : null,
        toAccountId: type === 'transfer' ? toAccountId : null,
        description: description.trim() || (categoryId && labelOf.get(categoryId)) || TYPE_OPTIONS.find((option) => option.value === type)?.label || 'Transaction',
        amountPaise: parseRupeesToPaise(amount),
        categoryId: type === 'transfer' || !categoryId ? null : categoryId,
        notes,
      }, reason, keepOpen)
      if (keepOpen) {
        setDescription('')
        setAmount('')
        setNotes('')
        setShowNote(false)
        setCategoryId('')
        setMoreCategories(false)
        amountRef.current?.focus()
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this transaction.')
    } finally {
      setSaving(false)
    }
  }

  const accountSelect = (label: string, value: string, onChange: (id: string) => void) => (
    <label>
      {label}
      <select required value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select account</option>
        {activeAccounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
      </select>
    </label>
  )

  return (
    <form className="form-card txn-form" onSubmit={submit} onKeyDown={(event) => { if (event.key === 'Escape') onCancel() }}>
      <div className="txn-head">
        <h2 id="transaction-form-title">{transaction ? 'Edit transaction' : 'Add transaction'}</h2>
        <button type="button" className="icon-button" aria-label="Close" onClick={onCancel}><X size={18} /></button>
      </div>
      <div className="txn-body">
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="segmented-field">
          <span id="transaction-type-label" className="sr-only">Transaction type</span>
          <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={chooseType} labelledBy="transaction-type-label" />
        </div>
        <label className="amount-field">
          <span className="amount-prefix" aria-hidden="true">₹</span>
          <input ref={amountRef} aria-label="Amount (INR)" required autoFocus inputMode="decimal" autoComplete="off" pattern="[0-9]*\.?[0-9]{0,2}" title="Numbers only, up to 2 decimals (e.g. 250 or 99.50)" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" />
        </label>
        <label className="txn-field">
          What was this for?
          <input list="description-options" autoComplete="off" maxLength={160} value={description} onChange={(event) => changeDescription(event.target.value)} placeholder="Optional, e.g. Lunch or Rent" />
          <datalist id="description-options">
            {recentDescriptions.map((item) => <option key={item} value={item} />)}
          </datalist>
        </label>

        {type !== 'transfer' && (
          <div className="txn-field">
            <span id="category-label">Category</span>
            <ChoiceChips options={categoryChips} value={categoryId} onChange={setCategoryId} labelledBy="category-label" allowClear>
              <button type="button" className="chip chip-more" aria-expanded={moreCategories} onClick={() => setMoreCategories((open) => !open)}>{categoryChips.length ? 'More…' : 'Choose…'}</button>
            </ChoiceChips>
            {moreCategories && (
              <ComboBox label="Any category" className="txn-combo" options={[{ id: '', label: 'Uncategorized' }, ...categoryOptions]} value={categoryId} onChange={(id) => { setCategoryId(id); setMoreCategories(false) }} placeholder="Search categories" />
            )}
          </div>
        )}

        {type === 'transfer' ? (
          <div className="txn-pair">
            {accountSelect('From account', fromAccountId, setFromAccountId)}
            {accountSelect('To account', toAccountId, setToAccountId)}
          </div>
        ) : accountChips.length <= MAX_ACCOUNT_CHIPS ? (
          <div className="txn-field">
            <span id="account-label">{type === 'income' ? 'Received in' : 'Paid from'}</span>
            <ChoiceChips options={accountChips} value={accountId} onChange={setAccountId} labelledBy="account-label" />
          </div>
        ) : accountSelect(type === 'income' ? 'Received in' : 'Paid from', accountId, setAccountId)}

        <div className="txn-field">
          <span id="date-label">When</span>
          <ChoiceChips
            options={[{ id: 'today', label: 'Today' }, { id: 'yesterday', label: 'Yesterday' }, { id: 'other', label: dateChoice === 'other' ? 'Other date' : 'Pick date…' }]}
            value={dateChoice}
            onChange={chooseDate}
            labelledBy="date-label"
          />
          {dateChoice === 'other' && <input className="txn-date" required aria-label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />}
        </div>

        {showNote ? (
          <label className="txn-field">
            Note
            <textarea rows={2} maxLength={1000} autoFocus={!transaction} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
        ) : (
          <button type="button" className="text-button txn-note-link" onClick={() => setShowNote(true)}><Plus size={14} /> Add a note</button>
        )}
        {transaction && (
          <label className="txn-field">
            Edit note (optional)
            <input maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why was this changed?" />
          </label>
        )}
      </div>
      <div className="txn-footer">
        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? 'Saving…' : transaction ? 'Save changes' : 'Add transaction'}
        </button>
        {!transaction && <button className="button button-secondary" disabled={saving} type="submit" name="again">Save &amp; add another</button>}
      </div>
    </form>
  )
}
