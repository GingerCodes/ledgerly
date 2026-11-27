import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import './App.css'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  FileUp,
  FolderTree,
  Landmark,
  LockKeyhole,
  LogOut,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import {
  categoryPath,
  categoryDescendantIds,
  estimateFixedDepositMaturityValue,
  formatRupees,
  isIsoDate,
  parseNonNegativeRupeesToPaise,
  parseRupeesToPaise,
  type Account,
  type BalanceSnapshot,
  type Category,
  type FixedDeposit,
  type FixedDepositInput,
  type ImportedTransaction,
  type Transaction,
  type TransactionInput,
} from './domain/models'
import { FinanceDatabase } from './data/finance-database'
import { supabaseSetup } from './data/supabase-client'
import { copyToArrayBuffer, decryptBackup, encryptBackup } from './data/encrypted-backup'
import { exportTransactionsCsv, parseTransactionsCsv } from './data/transactions-csv'
import { summarizeExpenseReport } from './domain/reports'

type Section = 'overview' | 'transactions' | 'reports' | 'accounts' | 'deposits' | 'categories' | 'backups'
type ExpenseReportFilters = {
  startDate: string
  endDate: string
  categoryId: string | null
  includeSubcategories: boolean
}
const INITIAL_TIME = new Date()
const CURRENT_YEAR = INITIAL_TIME.getFullYear()
const CURRENT_HOUR = INITIAL_TIME.getHours()
const CURRENT_DATE = todayIso()
const REPORT_MONTH_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const ALL_CATEGORIES = 'all'
const UNCATEGORIZED = 'uncategorized'

const sections: Array<{ id: Section; label: string; icon: typeof Wallet }> = [
  { id: 'overview', label: 'Overview', icon: ChartNoAxesCombined },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'reports', label: 'Reports', icon: ChartNoAxesCombined },
  { id: 'accounts', label: 'Accounts', icon: Landmark },
  { id: 'deposits', label: 'Fixed deposits', icon: BriefcaseBusiness },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'backups', label: 'Backup & import', icon: ShieldCheck },
]

function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatReportMonth(month: string): string {
  return REPORT_MONTH_FORMATTER.format(new Date(`${month}-01T00:00:00.000Z`))
}

function maskAccountNumber(value: string): string {
  if (!value) return '—'
  return `•••• ${value.slice(-4)}`
}

function downloadFile(filename: string, blob: Blob): void {
  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(blob)
  link.href = objectUrl
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

function amountInputValue(amountPaise: number): string {
  return (amountPaise / 100).toFixed(2)
}

function Notice({ error, success }: { error: string; success: string }) {
  if (!error && !success) return null
  return (
    <div className={`notice ${error ? 'notice-error' : 'notice-success'}`} role={error ? 'alert' : 'status'}>
      {error || success}
    </div>
  )
}

function AuthScreen({
  client,
  configurationError,
  externalError,
  clearExternalError,
}: {
  client: SupabaseClient | null
  configurationError: string
  externalError: string
  clearExternalError: () => void
}) {
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client) return
    setBusy(true)
    clearExternalError()
    setError('')
    setSuccess('')
    try {
      if (creatingAccount) {
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim(),
          password,
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setSuccess('Account created. Check your email to confirm the address, then sign in.')
        }
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) throw signInError
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  async function signInWithGoogle() {
    if (!client) return
    setBusy(true)
    clearExternalError()
    setError('')
    setSuccess('')
    try {
      const { error: signInError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      })
      if (signInError) throw signInError
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Google sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="loading-mark"><Wallet size={28} /></div>
        <p className="eyebrow">PRIVATE FINANCE TRACKER</p>
        <h1>{client ? 'Sign in to Ledgerly' : 'Connect Ledgerly to Supabase'}</h1>
        <p className="auth-description">
          {client
            ? 'Your finance records are stored in your private Supabase account.'
            : 'Set your Supabase project URL and publishable/anon key in a local environment file.'}
        </p>
        {(configurationError || externalError || error) && (
          <p className="form-error" role="alert">{configurationError || externalError || error}</p>
        )}
        {success && <p className="auth-success" role="status">{success}</p>}
        {!client ? (
          <ol className="auth-setup">
            <li>Copy <code>.env.example</code> to <code>.env.local</code>.</li>
            <li>Enter the project URL and publishable/anon key from Supabase Project Settings → API.</li>
            <li>Apply the SQL migration documented in README, then restart the app.</li>
          </ol>
        ) : (
          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete={creatingAccount ? 'new-password' : 'current-password'} minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : creatingAccount ? 'Create account' : 'Sign in'}
            </button>
            <button className="button button-secondary" type="button" disabled={busy} onClick={() => void signInWithGoogle()}>
              Continue with Google
            </button>
            <button className="auth-switch" type="button" disabled={busy} onClick={() => { setCreatingAccount(!creatingAccount); clearExternalError(); setError(''); setSuccess('') }}>
              {creatingAccount ? 'Already have an account? Sign in' : 'New to Ledgerly? Create an account'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

function EmptyState({ children }: { children: string }) {
  return <div className="empty-state"><CircleHelp size={20} />{children}</div>
}

function TransactionForm({
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
  const [categoryText, setCategoryText] = useState(transaction?.categoryId ? categoryPath(transaction.categoryId, categories) : '')
  const categoryOptions = categories
    .filter((category) => category.active || category.id === transaction?.categoryId)
    .map((category) => ({ id: category.id, label: categoryPath(category.id, categories) }))
  const categoryId = categoryOptions.find((option) => option.label === categoryText)?.id ?? ''
  const [notes, setNotes] = useState(transaction?.notes ?? '')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const descriptionRef = useRef<HTMLInputElement>(null)
  const recentDescriptions = useMemo(() => [...new Set(transactions.map((item) => item.description))].slice(0, 50), [transactions])

  // Fill the category from the latest transaction with the same description, only when the field is still empty.
  const changeDescription = (value: string) => {
    setDescription(value)
    if (type === 'transfer' || categoryText) return
    const key = value.trim().toLowerCase()
    const match = transactions
      .filter((item) => item.categoryId && item.description.trim().toLowerCase() === key)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    const option = match && categoryOptions.find((item) => item.id === match.categoryId)
    if (option) setCategoryText(option.label)
  }

  const chooseType = (nextType: TransactionInput['type']) => {
    setType(nextType)
    if (nextType !== 'transfer') {
      setFromAccountId('')
      setToAccountId('')
      if (nextType === 'expense') setAccountId('CASH')
    } else {
      setAccountId('')
      setCategoryText('')
      setFromAccountId('CASH')
      setToAccountId(accounts.find((account) => account.id !== 'CASH')?.id ?? '')
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const keepOpen = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('name') === 'again'
    setFormError('')
    if (type !== 'transfer' && categoryText && !categoryId) {
      setFormError('Pick a category from the list, or clear the field for Uncategorized.')
      return
    }
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
        setCategoryText('')
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
                {accounts.filter((account) => account.status === 'active').map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
            <label>
              To account
              <select required value={toAccountId} onChange={(event) => setToAccountId(event.target.value)}>
                <option value="">Select account</option>
                {accounts.filter((account) => account.status === 'active').map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </label>
          </>
        ) : (
          <label>
            Account
            <select
              required
              disabled={type === 'expense'}
              value={type === 'expense' ? 'CASH' : accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              {accounts.filter((account) => account.status === 'active' && (type !== 'expense' || account.id === 'CASH')).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            {type === 'expense' && <span className="field-hint">Daily expenses are recorded from cash.</span>}
          </label>
        )}
        {type !== 'transfer' && (
          <label>
            Category
            <input list="category-options" autoComplete="off" onFocus={(event) => event.currentTarget.select()} value={categoryText} placeholder="Uncategorized — type to search" onChange={(event) => setCategoryText(event.target.value)} />
            <datalist id="category-options">
              {categoryOptions.map((option) => <option key={option.id} value={option.label} />)}
            </datalist>
          </label>
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
      <div className="form-actions" style={{ flexDirection: 'row-reverse', gap: 8 }}>
        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? 'Saving…' : transaction ? 'Save changes' : 'Add transaction'}
        </button>
        {!transaction && <button className="button button-secondary" disabled={saving} type="submit" name="again">Save &amp; add another</button>}
      </div>
    </form>
  )
}

function AccountForm({
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

function DepositForm({
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
        maturityInstruction,
        status: deposit?.status ?? 'active',
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
        <label>Linked maturity account
          <select value={linkedAccountId} onChange={(event) => setLinkedAccountId(event.target.value)}>
            <option value="">Not specified</option>
            {accounts.filter((account) => account.type === 'savings').map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <label>Maturity instruction<input maxLength={200} value={maturityInstruction} onChange={(event) => setMaturityInstruction(event.target.value)} placeholder="Renew principal; credit interest" /></label>
        <label className="span-two">Notes<textarea rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      </div>
      <div className="form-actions"><button className="button button-primary" type="submit">Save deposit</button></div>
    </form>
  )
}

function CategoryForm({
  categories,
  category,
  onCancel,
  onSave,
}: {
  categories: Category[]
  category: Category | null
  onCancel: () => void
  onSave: (value: { id?: string; name: string; parentCategoryId: string | null }) => Promise<void>
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [parentCategoryId, setParentCategoryId] = useState(category?.parentCategoryId ?? '')
  const [formError, setFormError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    try {
      await onSave({ ...(category ? { id: category.id } : {}), name, parentCategoryId: parentCategoryId || null })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this category.')
    }
  }

  return (
    <form className="form-card compact-form" onSubmit={submit}>
      <div className="form-heading">
        <div><p className="eyebrow">Multi-level categories</p><h2>{category ? 'Edit category' : 'Add category'}</h2></div>
        <button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button>
      </div>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="form-grid">
        <label>Category name<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Parent category
          <select value={parentCategoryId} onChange={(event) => setParentCategoryId(event.target.value)}>
            <option value="">Top level</option>
            {categories.filter((item) => item.id !== category?.id).map((item) => <option key={item.id} value={item.id}>{categoryPath(item.id, categories)}</option>)}
          </select>
        </label>
      </div>
      <div className="form-actions"><button className="button button-primary" type="submit">Save category</button></div>
    </form>
  )
}

function App() {
  const { client: supabase } = supabaseSetup
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [authStateError, setAuthStateError] = useState('')
  const [database, setDatabase] = useState<FinanceDatabase | null>(null)
  const databaseRef = useRef<FinanceDatabase | null>(null)
  const [loadingError, setLoadingError] = useState('')
  const [section, setSection] = useState<Section>('overview')
  const [reloadKey, setReloadKey] = useState(0)
  const [notice, setNotice] = useState({ error: '', success: '' })
  const [transactionForm, setTransactionForm] = useState<Transaction | null | undefined>(undefined)
  const [accountForm, setAccountForm] = useState<Account | null | undefined>(undefined)
  const [depositForm, setDepositForm] = useState<FixedDeposit | null | undefined>(undefined)
  const [categoryForm, setCategoryForm] = useState<Category | null | undefined>(undefined)
  const [year, setYear] = useState(CURRENT_YEAR)
  const [transactionSearch, setTransactionSearch] = useState('')
  const [reportStartDate, setReportStartDate] = useState(`${CURRENT_YEAR}-01-01`)
  const [reportEndDate, setReportEndDate] = useState(CURRENT_DATE)
  const [reportCategoryId, setReportCategoryId] = useState(ALL_CATEGORIES)
  const [includeReportSubcategories, setIncludeReportSubcategories] = useState(true)
  const [reportFilters, setReportFilters] = useState<ExpenseReportFilters | null>(null)
  const [reportError, setReportError] = useState('')
  const [csvPreview, setCsvPreview] = useState<{ fileName: string; rows: ImportedTransaction[]; errors: string[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const [backupPassphrase, setBackupPassphrase] = useState('')
  const [backupPassphraseConfirmation, setBackupPassphraseConfirmation] = useState('')
  const [restorePassphrase, setRestorePassphrase] = useState('')
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [snapshotBalance, setSnapshotBalance] = useState('')
  const [snapshotAccountId, setSnapshotAccountId] = useState('')
  const [snapshotDate, setSnapshotDate] = useState(todayIso())
  const [snapshotSource, setSnapshotSource] = useState('')
  const [snapshotNotes, setSnapshotNotes] = useState('')
  const sessionUserId = session?.user.id

  useEffect(() => {
    if (!supabase) return

    let active = true
    supabase.auth.initialize().then(async ({ error: initializationError }) => {
      const { data, error } = await supabase.auth.getSession()
      if (!active) return
      if (initializationError || error) {
        setAuthStateError((initializationError || error)?.message ?? 'Authentication failed.')
      } else {
        setSession(data.session)
      }
      setAuthReady(true)
    }).catch((error: unknown) => {
      if (!active) return
      setAuthStateError(error instanceof Error ? error.message : 'Authentication failed.')
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setAuthStateError('')
      setLoadingError('')
      if (event === 'SIGNED_OUT' && databaseRef.current) {
        void databaseRef.current.close()
        databaseRef.current = null
        setDatabase(null)
      }
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    if (!supabase || !sessionUserId) return

    let active = true
    FinanceDatabase.open(supabase, sessionUserId).then((opened) => {
      if (active) {
        databaseRef.current = opened
        setDatabase(opened)
      }
    }).catch((error: unknown) => {
      if (active) setLoadingError(error instanceof Error ? error.message : 'Could not open Supabase finance data.')
    })
    return () => { active = false }
  }, [supabase, sessionUserId])

  const viewData = useMemo(() => ({
    revision: reloadKey,
    accounts: database?.getAccounts() ?? [],
    categories: database?.getCategories() ?? [],
    transactions: database?.getTransactions(year, transactionSearch) ?? [],
    summary: database?.getYearSummary(year),
    deposits: database?.getFixedDeposits() ?? [],
    snapshots: database?.getBalanceSnapshots() ?? [],
    reportTransactions: database && reportFilters
      ? database.getExpenseReportTransactions(
        reportFilters.startDate,
        reportFilters.endDate,
        reportFilters.categoryId === null
          ? null
          : reportFilters.categoryId === UNCATEGORIZED
            ? []
            : reportFilters.includeSubcategories
              ? categoryDescendantIds(reportFilters.categoryId, database.getCategories())
              : [reportFilters.categoryId],
      )
      : [],
  }), [database, reloadKey, year, transactionSearch, reportFilters])
  const { accounts, categories, transactions, summary, deposits, snapshots, reportTransactions } = viewData

  const refresh = () => setReloadKey((key) => key + 1)

  async function runAction(action: () => Promise<unknown>, success: string) {
    setNotice({ error: '', success: '' })
    try {
      await action()
      refresh()
      setNotice({ error: '', success })
    } catch (error) {
      setNotice({ error: error instanceof Error ? error.message : 'The requested action failed.', success: '' })
      throw error
    }
  }

  function showSuccess(message: string) {
    setNotice({ error: '', success: message })
  }

  function showError(error: unknown) {
    setNotice({ error: error instanceof Error ? error.message : 'The requested action failed.', success: '' })
  }

  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) showError(error)
  }

  if (!authReady) {
    return <main className="loading-screen"><div className="loading-mark"><Wallet size={28} /></div><h1>Ledgerly</h1><p>Connecting to Supabase…</p></main>
  }

  if (!session) {
    return (
      <AuthScreen
        client={supabase}
        configurationError={supabaseSetup.error}
        externalError={authStateError}
        clearExternalError={() => setAuthStateError('')}
      />
    )
  }

  if (!database) {
    return (
      <main className="loading-screen">
        <div className="loading-mark"><Wallet size={28} /></div>
        <h1>Personal Finance</h1>
        {loadingError ? <><p className="form-error" role="alert">{loadingError}</p><p>Supabase finance data could not be opened. Check the setup and reload.</p></> : <p>Loading your private Supabase finance data…</p>}
      </main>
    )
  }

  const activeSection = sections.find((item) => item.id === section)
  const spendingCategories = summary?.expensesByCategory
    .map((item) => ({ ...item, label: categoryPath(item.categoryId, categories) }))
    .sort((left, right) => right.amountPaise - left.amountPaise) ?? []
  const reportSummary = summarizeExpenseReport(reportTransactions, categories)
  const largestMonthlyExpense = Math.max(
    ...reportSummary.monthlyBreakdown.map((month) => month.amountPaise),
    1,
  )

  async function createTransaction(value: TransactionInput, reason: string, keepOpen: boolean) {
    await runAction(() => database!.saveTransaction(value, reason), value.id ? 'Transaction updated.' : 'Transaction added.')
    if (!keepOpen) setTransactionForm(undefined)
  }

  async function createAccount(value: Parameters<FinanceDatabase['saveAccount']>[0]) {
    await runAction(() => database!.saveAccount(value), value.id ? 'Account updated.' : 'Account added.')
    setAccountForm(undefined)
  }

  async function createDeposit(value: Parameters<FinanceDatabase['saveFixedDeposit']>[0]) {
    await runAction(() => database!.saveFixedDeposit(value), value.id ? 'Fixed deposit updated.' : 'Fixed deposit added.')
    setDepositForm(undefined)
  }

  async function createCategory(value: Parameters<FinanceDatabase['saveCategory']>[0]) {
    await runAction(() => database!.saveCategory(value), value.id ? 'Category updated.' : 'Category added.')
    setCategoryForm(undefined)
  }

  async function addSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await runAction(() => database!.saveBalanceSnapshot({
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

  function exportYearCsv() {
    try {
      const csv = exportTransactionsCsv(database!.getTransactions(year))
      downloadFile(`transactions-${year}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      showSuccess(`${year} transactions exported. Account numbers are not included.`)
    } catch (error) {
      showError(error)
    }
  }

  function generateExpenseReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice({ error: '', success: '' })
    setReportError('')
    if (!isIsoDate(reportStartDate) || !isIsoDate(reportEndDate) || reportStartDate > reportEndDate) {
      setReportError('Choose valid dates with the start date on or before the end date.')
      return
    }

    setReportFilters({
      startDate: reportStartDate,
      endDate: reportEndDate,
      categoryId: reportCategoryId === ALL_CATEGORIES ? null : reportCategoryId,
      includeSubcategories: includeReportSubcategories,
    })
  }

  function exportExpenseReport() {
    if (!reportFilters) return
    try {
      const csv = exportTransactionsCsv(reportTransactions)
      downloadFile(
        `expense-report-${reportFilters.startDate}-to-${reportFilters.endDate}.csv`,
        new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      )
      showSuccess('Filtered expense report exported without account numbers.')
    } catch (error) {
      showError(error)
    }
  }

  async function selectCsv(file: File | undefined) {
    if (!file) return
    try {
      const result = parseTransactionsCsv(await file.text(), new Set(accounts.map((account) => account.id)), new Set(categories.map((category) => category.id)))
      setCsvPreview({ fileName: file.name, rows: result.validRows, errors: result.errors })
      setNotice({ error: '', success: '' })
    } catch (error) {
      showError(error)
    }
  }

  async function importCsv() {
    if (!csvPreview || csvPreview.errors.length > 0) return
    setImporting(true)
    try {
      const result = await database!.importTransactions(csvPreview.rows)
      refresh()
      setCsvPreview(null)
      showSuccess(`Imported ${result.imported} transaction${result.imported === 1 ? '' : 's'}; skipped ${result.duplicates} duplicate${result.duplicates === 1 ? '' : 's'}.`)
    } catch (error) {
      showError(error)
    } finally {
      setImporting(false)
    }
  }

  async function createEncryptedBackup() {
    try {
      const bytes = await encryptBackup(await database!.getBackupBytes(), backupPassphrase)
      downloadFile(`finance-backup-${todayIso()}.pfbackup`, new Blob([copyToArrayBuffer(bytes)], { type: 'application/octet-stream' }))
      setBackupPassphrase('')
      setBackupPassphraseConfirmation('')
      showSuccess('Encrypted backup downloaded. Store it somewhere safe.')
    } catch (error) {
      showError(error)
    }
  }

  async function restoreEncryptedBackup() {
    if (!restoreFile) {
      showError(new Error('Choose an encrypted backup file first.'))
      return
    }
    if (!window.confirm('Restore this backup and replace all finance data in your Supabase account? This cannot be undone.')) return
    try {
      const bytes = new Uint8Array(await restoreFile.arrayBuffer())
      await database!.restoreBackupBytes(await decryptBackup(bytes, restorePassphrase))
      refresh()
      setRestoreFile(null)
      setRestorePassphrase('')
      showSuccess('Backup restored.')
    } catch (error) {
      showError(error)
    }
  }

  const recentTransactions = database.getTransactions(CURRENT_YEAR).slice(0, 5)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection('overview') }}>
          <span className="brand-mark"><Wallet size={21} /></span>
          <span><strong>Ledgerly</strong><small>PERSONAL FINANCE</small></span>
        </a>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="side-nav" aria-label="Main navigation">
          {sections.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`nav-item ${section === id ? 'selected' : ''}`} onClick={() => { setSection(id); setTransactionForm(undefined); setNotice({ error: '', success: '' }) }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{section === id && <ChevronRight className="nav-chevron" size={15} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-badge"><LockKeyhole size={16} /><span><b>Private by design</b><small>Protected by your account</small></span></div>
          <p className="sidebar-foot">Cloud-backed · INR only</p>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Wallet size={18} /></span> Ledgerly</div>
          <div className="breadcrumb">Finance <ChevronRight size={14} /> <strong>{activeSection?.label}</strong></div>
          <div className="topbar-right">
            <span className="local-status"><span /> Supabase · {session.user.email}</span>
            <button className="button button-secondary button-signout" onClick={() => void signOut()} aria-label="Sign out"><LogOut size={16} /><span>Sign out</span></button>
            <button className="button button-primary top-add" onClick={() => { setSection('transactions'); setTransactionForm(null) }}><Plus size={16} /> Add transaction</button>
          </div>
        </header>

        <main className="page-content">
          <Notice error={notice.error} success={notice.success} />

          {section === 'overview' && (
            <>
              <section className="page-heading">
                <div><p className="eyebrow">YOUR MONEY, CLEARLY</p><h1>Good {CURRENT_HOUR < 12 ? 'morning' : CURRENT_HOUR < 18 ? 'afternoon' : 'evening'}.</h1><p className="page-subtitle">A clear view of your finances, all in one place.</p></div>
                <button className="button button-primary" onClick={() => setTransactionForm(null)}><Plus size={16} /> New transaction</button>
              </section>
              <section className="metric-grid">
                <article className="metric-card"><div className="metric-label"><span className="metric-icon green"><Wallet size={18} /></span> Cash + savings</div><strong>{formatRupees(accounts.reduce((total, account) => total + account.currentBalancePaise, 0))}</strong><small>Across {accounts.length} accounts</small></article>
                <article className="metric-card"><div className="metric-label"><span className="metric-icon coral"><ArrowDownLeft size={18} /></span> Expenses · {year}</div><strong>{formatRupees(summary?.expensePaise ?? 0)}</strong><small>{summary?.transactionCount ?? 0} transactions this year</small></article>
                <article className="metric-card"><div className="metric-label"><span className="metric-icon blue"><ArrowUpRight size={18} /></span> Income · {year}</div><strong>{formatRupees(summary?.incomePaise ?? 0)}</strong><small>Transfers are excluded from income</small></article>
                <article className="metric-card"><div className="metric-label"><span className="metric-icon purple"><BriefcaseBusiness size={18} /></span> Fixed deposits</div><strong>{formatRupees(deposits.filter((deposit) => deposit.status === 'active').reduce((total, deposit) => total + deposit.principalPaise, 0))}</strong><small>{deposits.filter((deposit) => deposit.status === 'active').length} active deposits</small></article>
              </section>
              <div className="dashboard-grid">
                <section className="panel account-panel">
                  <div className="panel-heading"><div><p className="eyebrow">YOUR ACCOUNTS</p><h2>Balances</h2></div><button className="text-button" onClick={() => setSection('accounts')}>View accounts <ChevronRight size={15} /></button></div>
                  {accounts.length ? accounts.map((account) => (
                    <div className="balance-row" key={account.id}><span className={`account-type-icon ${account.type}`}><Banknote size={17} /></span><span className="balance-name"><b>{account.name}</b><small>{account.id === 'CASH' ? 'Cash account' : `${account.institution} · ${maskAccountNumber(account.accountNumber)}`}</small></span><strong>{formatRupees(account.currentBalancePaise)}</strong></div>
                  )) : <EmptyState>No accounts added.</EmptyState>}
                </section>
                <section className="panel spending-panel">
                  <div className="panel-heading"><div><p className="eyebrow">WHERE IT GOES</p><h2>Top spending · {year}</h2></div><button className="year-chip" onClick={() => setYear(year - 1)} aria-label="Show previous year">{year}</button></div>
                  {spendingCategories.length ? spendingCategories.slice(0, 5).map((item, index) => {
                    const percent = summary?.expensePaise ? (item.amountPaise / summary.expensePaise) * 100 : 0
                    return <div className="spending-item" key={`${item.categoryId ?? 'none'}-${index}`}><div className="spending-copy"><span>{item.label}</span><b>{formatRupees(item.amountPaise)}</b></div><div className="progress-track"><span style={{ width: `${Math.min(percent, 100)}%` }} /></div></div>
                  }) : <EmptyState>No expense categories yet.</EmptyState>}
                </section>
              </div>
              <section className="panel recent-panel">
                <div className="panel-heading"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent transactions</h2></div><button className="text-button" onClick={() => setSection('transactions')}>All transactions <ChevronRight size={15} /></button></div>
                {recentTransactions.length ? <TransactionTable transactions={recentTransactions} accounts={accounts} categories={categories} onEdit={(item) => setTransactionForm(item)} compact /> : <EmptyState>Your transactions will appear here.</EmptyState>}
              </section>
            </>
          )}

          {section === 'transactions' && (
            <>
              <section className="page-heading">
                <div><p className="eyebrow">DAILY MONEY MOVEMENT</p><h1>Transactions</h1><p className="page-subtitle">Track spending, income, and transfers between accounts.</p></div>
                <button className="button button-primary" onClick={() => setTransactionForm(null)}><Plus size={16} /> Add transaction</button>
              </section>
              {transactionForm !== undefined && <TransactionForm key={transactionForm?.id ?? 'new-transaction'} transaction={transactionForm} accounts={accounts} categories={categories} transactions={transactions} onCancel={() => setTransactionForm(undefined)} onSave={createTransaction} />}
              <section className="panel table-panel">
                <div className="list-toolbar">
                  <div className="list-title"><h2>All transactions</h2><span className="count-pill">{transactions.length}</span></div>
                  <div className="toolbar-controls">
                    <label className="search-field"><Search size={16} /><input value={transactionSearch} onChange={(event) => setTransactionSearch(event.target.value)} placeholder="Search descriptions" /></label>
                    <select className="year-select" aria-label="Transaction year" value={year} onChange={(event) => setYear(Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => CURRENT_YEAR - index).map((value) => <option key={value} value={value}>{value}</option>)}</select>
                    <button className="button button-secondary" onClick={exportYearCsv}><Download size={15} /> Export {year}</button>
                  </div>
                </div>
                {transactions.length ? <TransactionTable transactions={transactions} accounts={accounts} categories={categories} onEdit={(item) => setTransactionForm(item)} /> : <EmptyState>No transactions found for this year.</EmptyState>}
              </section>
            </>
          )}

          {section === 'reports' && (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">EXPENSE ANALYSIS</p>
                  <h1>Reports</h1>
                  <p className="page-subtitle">Summarize category spending for any date range.</p>
                </div>
              </section>
              <section className="panel report-filter-panel">
                <form onSubmit={generateExpenseReport}>
                  <div className="report-filter-grid">
                    <label>From date<input required type="date" value={reportStartDate} onChange={(event) => setReportStartDate(event.target.value)} /></label>
                    <label>To date<input required type="date" value={reportEndDate} onChange={(event) => setReportEndDate(event.target.value)} /></label>
                    <label>Category
                      <select value={reportCategoryId} onChange={(event) => setReportCategoryId(event.target.value)}>
                        <option value={ALL_CATEGORIES}>All categories</option>
                        <option value={UNCATEGORIZED}>Uncategorized</option>
                        {categories.map((category) => <option key={category.id} value={category.id}>{categoryPath(category.id, categories)}</option>)}
                      </select>
                    </label>
                    <label className="report-checkbox">
                      <input
                        type="checkbox"
                        checked={includeReportSubcategories}
                        disabled={reportCategoryId === ALL_CATEGORIES || reportCategoryId === UNCATEGORIZED}
                        onChange={(event) => setIncludeReportSubcategories(event.target.checked)}
                      />
                      Include subcategories
                    </label>
                    <button className="button button-primary report-generate" type="submit"><ChartNoAxesCombined size={17} /> Generate report</button>
                  </div>
                  {reportError && <p className="form-error report-error" role="alert">{reportError}</p>}
                </form>
              </section>
              {reportFilters ? (
                <>
                  <div className="report-result-heading">
                    <div>
                      <p className="eyebrow">GENERATED SUMMARY</p>
                      <h2>{reportFilters.startDate} – {reportFilters.endDate}</h2>
                      <p>{reportFilters.categoryId === null
                        ? 'All categories'
                        : reportFilters.categoryId === UNCATEGORIZED
                          ? 'Uncategorized'
                          : categoryPath(reportFilters.categoryId, categories)}
                        {reportFilters.categoryId !== null && reportFilters.categoryId !== UNCATEGORIZED && reportFilters.includeSubcategories ? ' · including subcategories' : ''}
                      </p>
                    </div>
                    <button className="button button-secondary" onClick={exportExpenseReport}><Download size={16} /> Export report CSV</button>
                  </div>
                  <section className="report-metrics">
                    <article className="report-metric-card"><span>Total expenses</span><strong>{formatRupees(reportSummary.totalPaise)}</strong></article>
                    <article className="report-metric-card"><span>Transactions</span><strong>{reportSummary.transactionCount.toLocaleString('en-IN')}</strong></article>
                    <article className="report-metric-card"><span>Average per transaction</span><strong>{formatRupees(reportSummary.transactionCount ? Math.round(reportSummary.totalPaise / reportSummary.transactionCount) : 0)}</strong></article>
                  </section>
                  <div className="report-breakdown-grid">
                    <section className="panel report-breakdown">
                      <div className="panel-heading"><div><p className="eyebrow">OVER TIME</p><h2>Monthly expenses</h2></div></div>
                      {reportSummary.monthlyBreakdown.length ? (
                        <div className="report-bar-list">
                          {reportSummary.monthlyBreakdown.map((month) => {
                            const monthName = formatReportMonth(month.month)
                            return (
                              <div className="report-bar-row" key={month.month}>
                                <span className="report-bar-label">{monthName}<small>{month.transactionCount} transaction{month.transactionCount === 1 ? '' : 's'}</small></span>
                                <span className="report-bar-track" aria-hidden="true"><span style={{ width: `${(month.amountPaise / largestMonthlyExpense) * 100}%` }} /></span>
                                <strong>{formatRupees(month.amountPaise)}</strong>
                              </div>
                            )
                          })}
                        </div>
                      ) : <EmptyState>No expenses match this report.</EmptyState>}
                    </section>
                    <section className="panel report-breakdown">
                      <div className="panel-heading"><div><p className="eyebrow">CATEGORY DETAIL</p><h2>Where it went</h2></div></div>
                      {reportSummary.categoryBreakdown.length ? (
                        <div className="report-category-list">
                          {reportSummary.categoryBreakdown.map((category) => (
                            <div className="report-category-row" key={category.categoryId ?? UNCATEGORIZED}>
                              <span>{category.categoryPath}<small>{category.transactionCount} transaction{category.transactionCount === 1 ? '' : 's'}</small></span>
                              <strong>{formatRupees(category.amountPaise)}</strong>
                            </div>
                          ))}
                        </div>
                      ) : <EmptyState>No category totals to show.</EmptyState>}
                    </section>
                  </div>
                  <section className="panel report-transactions">
                    <div className="panel-heading"><div><p className="eyebrow">MATCHING RECORDS</p><h2>Expense transactions</h2></div><span className="count-pill">{reportSummary.transactionCount}</span></div>
                    {reportTransactions.length
                      ? <TransactionTable
                        transactions={reportTransactions}
                        accounts={accounts}
                        categories={categories}
                        onEdit={(item) => { setSection('transactions'); setTransactionForm(item) }}
                      />
                      : <EmptyState>No expenses match this period and category.</EmptyState>}
                  </section>
                </>
              ) : (
                <section className="panel report-empty"><EmptyState>Choose a period and category, then generate a report.</EmptyState></section>
              )}
              <p className="report-footnote">Reports include expenses only. Income and transfers are excluded; date boundaries are inclusive.</p>
            </>
          )}

          {section === 'accounts' && (
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
                  <label>Account<select required value={snapshotAccountId} onChange={(event) => setSnapshotAccountId(event.target.value)}><option value="">Select account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
                  <label>As of date<input required type="date" value={snapshotDate} onChange={(event) => setSnapshotDate(event.target.value)} /></label>
                  <label>Reported balance (INR)<input required inputMode="decimal" value={snapshotBalance} onChange={(event) => setSnapshotBalance(event.target.value)} placeholder="0.00" /></label>
                  <label>Source<input required value={snapshotSource} onChange={(event) => setSnapshotSource(event.target.value)} placeholder="Bank statement" /></label>
                  <button className="button button-primary" type="submit"><Plus size={15} /> Save snapshot</button>
                  <label className="snapshot-notes">Notes (optional)<input value={snapshotNotes} onChange={(event) => setSnapshotNotes(event.target.value)} /></label>
                </form>
                {snapshots.length > 0 && <div className="snapshot-list">{snapshots.slice(0, 6).map((snapshot) => <SnapshotRow key={snapshot.id} snapshot={snapshot} accounts={accounts} />)}</div>}
              </section>
            </>
          )}

          {section === 'deposits' && (
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
                  <div className="deposit-details"><span>Rate <b>{(deposit.annualRateBasisPoints / 100).toFixed(2)}%</b></span><span>Matures <b>{deposit.maturityDate}</b></span></div>
                  <div className="deposit-estimate"><small>Estimated maturity value · not bank-confirmed</small><strong>{estimate}</strong></div>
                  <div className="deposit-actions"><button className="text-button" onClick={() => setDepositForm(deposit)}><Pencil size={14} /> Edit details</button>{deposit.status === 'active' && <button className="text-button danger-text" onClick={() => void runAction(() => database.closeFixedDeposit(deposit.id), 'Deposit marked as closed.').catch(() => undefined)}><Check size={14} /> Mark closed</button>}</div>
                </article>
              })}</section> : <section className="panel"><EmptyState>No fixed deposits added yet.</EmptyState></section>}
            </>
          )}

          {section === 'categories' && (
            <>
              <section className="page-heading"><div><p className="eyebrow">MAKE SENSE OF SPENDING</p><h1>Categories</h1><p className="page-subtitle">Organize expenses into a hierarchy that works for you.</p></div><button className="button button-primary" onClick={() => setCategoryForm(null)}><Plus size={16} /> Add category</button></section>
              {categoryForm !== undefined && <CategoryForm key={categoryForm?.id ?? 'new-category'} categories={categories} category={categoryForm} onCancel={() => setCategoryForm(undefined)} onSave={createCategory} />}
              <section className="panel category-panel">
                {categories.map((category) => <div className={`category-row ${!category.active ? 'inactive-category' : ''}`} key={category.id}>
                  <span className="category-indent" style={{ '--depth': categoryPath(category.id, categories).split(' > ').length - 1 } as CSSProperties}><span /></span>
                  <span className="category-name">{category.name}<small>{categoryPath(category.id, categories)}</small></span>
                  <span className={`status-pill ${category.active ? 'status-active' : 'status-closed'}`}>{category.active ? 'Active' : 'Archived'}</span>
                  <button className="icon-button" aria-label={`Edit ${category.name}`} onClick={() => setCategoryForm(category)}><Pencil size={15} /></button>
                  <button className="text-button" onClick={() => void runAction(() => database.setCategoryActive(category.id, !category.active), category.active ? 'Category archived.' : 'Category reactivated.').catch(() => undefined)}>{category.active ? 'Archive' : 'Restore'}</button>
                </div>)}
              </section>
            </>
          )}

          {section === 'backups' && (
            <>
              <section className="page-heading"><div><p className="eyebrow">KEEP YOUR DATA SAFE</p><h1>Backup & import</h1><p className="page-subtitle">Create an encrypted copy or restore from an earlier backup.</p></div></section>
              <div className="backup-grid">
                <section className="panel backup-card">
                  <div className="backup-icon"><LockKeyhole size={20} /></div><p className="eyebrow">ENCRYPTED BACKUP</p><h2>Take your data with you</h2><p>Create a password-protected backup file. Keep the passphrase separate; it cannot be recovered if lost.</p>
                  <label>Backup passphrase<input type="password" autoComplete="new-password" value={backupPassphrase} onChange={(event) => setBackupPassphrase(event.target.value)} placeholder="At least 12 characters" /></label>
                  <label>Confirm passphrase<input type="password" autoComplete="new-password" value={backupPassphraseConfirmation} onChange={(event) => setBackupPassphraseConfirmation(event.target.value)} /></label>
                  <button className="button button-primary" disabled={backupPassphrase.length < 12 || backupPassphrase !== backupPassphraseConfirmation} onClick={() => void createEncryptedBackup()}><Download size={16} /> Download encrypted backup</button>
                  <div className="security-note"><ShieldCheck size={16} /> AES-256-GCM encryption · passphrase-derived key</div>
                </section>
                <section className="panel backup-card">
                  <div className="backup-icon restore"><FileUp size={20} /></div><p className="eyebrow">RESTORE DATA</p><h2>Load a previous backup</h2><p>Restoring replaces all finance data in your Supabase account. Export a backup first if you need to keep both.</p>
                  <label>Encrypted backup file<input type="file" accept=".pfbackup,application/octet-stream" onChange={(event) => setRestoreFile(event.target.files?.[0] ?? null)} /></label>
                  <label>Backup passphrase<input type="password" autoComplete="current-password" value={restorePassphrase} onChange={(event) => setRestorePassphrase(event.target.value)} /></label>
                  <button className="button button-secondary" disabled={!restoreFile || !restorePassphrase} onClick={() => void restoreEncryptedBackup()}><FileUp size={16} /> Restore backup</button>
                </section>
              </div>
              <section className="panel csv-import-panel">
                <div className="backup-icon csv"><ArrowLeftRight size={20} /></div><p className="eyebrow">ONE-TIME HISTORICAL IMPORT</p><h2>Import transactions from CSV</h2><p>Choose an annual CSV export in this app's format. Review validation before importing; existing transaction IDs are skipped.</p>
                <label className="file-drop"><FileUp size={20} /><span><b>Select a CSV file</b><small>CSV is read in your browser and saved to Supabase.</small></span><input type="file" accept=".csv,text/csv" onChange={(event) => void selectCsv(event.target.files?.[0])} /></label>
                {csvPreview && <div className="csv-preview">
                  <div className="preview-heading"><b>{csvPreview.fileName}</b><span>{csvPreview.rows.length} valid row{csvPreview.rows.length === 1 ? '' : 's'}</span></div>
                  {csvPreview.errors.length > 0 && <ul className="csv-errors">{csvPreview.errors.slice(0, 12).map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul>}
                  {csvPreview.errors.length > 12 && <p className="field-hint">And {csvPreview.errors.length - 12} more issues.</p>}
                  {csvPreview.errors.length === 0 && <p className="field-hint">Ready to import. Existing IDs will be skipped; duplicate rows in this file are counted once.</p>}
                  <button className="button button-primary" disabled={importing || csvPreview.errors.length > 0 || csvPreview.rows.length === 0} onClick={() => void importCsv()}><FileUp size={15} /> {importing ? 'Importing…' : 'Import valid rows'}</button>
                </div>}
              </section>
              <div className="data-warning"><CircleHelp size={17} /><span><b>Supabase cloud storage</b>Your records are stored in your authenticated Supabase account. Download encrypted backups regularly; the app cannot recover a lost backup passphrase.</span></div>
            </>
          )}
        </main>
        <footer className="app-footer"><span>Ledgerly · Personal Finance Tracker</span><span><LockKeyhole size={13} /> Stored in your private Supabase account</span></footer>
      </div>

      {transactionForm !== undefined && section !== 'transactions' && section !== 'overview' && null}
      {transactionForm !== undefined && section === 'overview' && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setTransactionForm(undefined) }}>
          <div className="modal-content"><TransactionForm transaction={transactionForm} accounts={accounts} categories={categories} transactions={transactions} onCancel={() => setTransactionForm(undefined)} onSave={createTransaction} /></div>
        </div>
      )}
    </div>
  )
}

function TransactionTable({
  transactions,
  accounts,
  categories,
  onEdit,
  compact = false,
}: {
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  onEdit: (transaction: Transaction) => void
  compact?: boolean
}) {
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]))
  return (
    <div className={`table-wrap ${compact ? 'compact-table' : ''}`}>
      <table className="data-table">
        <thead><tr><th>Date</th><th>Description</th><th>Category / account</th><th>Type</th><th className="align-right">Amount</th><th aria-label="Actions" /></tr></thead>
        <tbody>{transactions.map((transaction) => {
          const accountLabel = transaction.type === 'transfer'
            ? `${accountNames.get(transaction.fromAccountId ?? '') ?? 'Unknown'} → ${accountNames.get(transaction.toAccountId ?? '') ?? 'Unknown'}`
            : accountNames.get(transaction.accountId ?? '') ?? 'Unknown account'
          return <tr key={transaction.id}>
            <td className="date-cell">{transaction.date}</td>
            <td><b>{transaction.description}</b>{transaction.notes && <small className="table-note">{transaction.notes}</small>}</td>
            <td><span className="category-cell">{transaction.type === 'transfer' ? accountLabel : categoryPath(transaction.categoryId, categories)}</span><small className="table-note">{transaction.type === 'transfer' ? 'Account transfer' : accountLabel}</small></td>
            <td><span className={`transaction-type ${transaction.type}`}>{transaction.type}</span></td>
            <td className={`amount-cell align-right ${transaction.type === 'income' ? 'income-amount' : transaction.type === 'expense' ? 'expense-amount' : ''}`}>{transaction.type === 'expense' ? '−' : transaction.type === 'income' ? '+' : ''}{formatRupees(transaction.amountPaise)}</td>
            <td><button className="icon-button" aria-label={`Edit ${transaction.description}`} onClick={() => onEdit(transaction)}><Pencil size={15} /></button></td>
          </tr>
        })}</tbody>
      </table>
    </div>
  )
}

function SnapshotRow({ snapshot, accounts }: { snapshot: BalanceSnapshot; accounts: Account[] }) {
  const account = accounts.find((item) => item.id === snapshot.accountId)
  const difference = snapshot.reportedBalancePaise - snapshot.calculatedBalancePaise
  return (
    <div className="snapshot-row">
      <span><b>{account?.name ?? 'Unknown account'}</b><small>{snapshot.date} · {snapshot.source}</small></span>
      <span><small>Reported</small><strong>{formatRupees(snapshot.reportedBalancePaise)}</strong></span>
      <span><small>From transactions</small><strong>{formatRupees(snapshot.calculatedBalancePaise)}</strong></span>
      <span className={`snapshot-difference ${difference === 0 ? 'matched' : ''}`}>
        {difference === 0 ? 'Matches' : `${formatRupees(Math.abs(difference))} ${difference > 0 ? 'higher' : 'lower'}`}
      </span>
      {snapshot.notes && <small className="snapshot-note">{snapshot.notes}</small>}
    </div>
  )
}

export default App
