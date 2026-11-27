import { useState } from 'react'
import { ChevronRight, LockKeyhole, LogOut, Plus } from 'lucide-react'
import { type Transaction, type TransactionInput } from '../domain/models'
import { Logo } from '../components/Logo'
import { Notice } from '../components/Notice'
import { AccountsPage } from '../features/accounts/AccountsPage'
import { DepositsPage } from '../features/deposits/DepositsPage'
import { OverviewPage } from '../features/overview/OverviewPage'
import { ReportsPage } from '../features/reports/ReportsPage'
import { useExpenseReport } from '../features/reports/useExpenseReport'
import { SettingsPage } from '../features/settings/SettingsPage'
import { TransactionForm } from '../features/transactions/TransactionForm'
import { TransactionsPage } from '../features/transactions/TransactionsPage'
import { CURRENT_YEAR } from '../lib/dates'
import { appVersion } from '../lib/version'
import { useFinance, useFinanceQuery } from './finance-context'
import { sections, type Section } from './navigation'

export function AppShell({ userName, fullName, email, onSignOut, onUpdateName }: {
  /** Name for the top bar (falls back to the email). */
  userName: string
  /** The stored full name, or '' if none. */
  fullName: string
  email: string | undefined
  /** Resolves to the sign-out error, if any. */
  onSignOut: (options?: { local?: boolean }) => Promise<Error | null>
  onUpdateName: (name: string) => Promise<Error | null>
}) {
  const { database, accounts, categories, notice, clearNotice, runAction, showError } = useFinance()
  const [section, setSection] = useState<Section>('overview')
  const [year, setYear] = useState(CURRENT_YEAR)
  // undefined = form closed, null = new transaction, otherwise the transaction being edited
  const [transactionForm, setTransactionForm] = useState<Transaction | null | undefined>(undefined)
  const report = useExpenseReport()
  const overviewTransactions = useFinanceQuery((db) => db.getTransactions(year), [year])
  const activeSection = sections.find((item) => item.id === section)

  async function saveTransaction(value: TransactionInput, reason: string, keepOpen: boolean) {
    await runAction(() => database.saveTransaction(value, reason), value.id ? 'Transaction updated.' : 'Transaction added.')
    if (!keepOpen) setTransactionForm(undefined)
  }

  async function signOut() {
    const error = await onSignOut()
    if (error) showError(error)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection('overview') }}>
          <span className="brand-mark"><Logo /></span>
          <span><strong>Ledgerly</strong><small>PERSONAL FINANCE</small></span>
        </a>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="side-nav" aria-label="Main navigation">
          {sections.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`nav-item ${section === id ? 'selected' : ''}`} onClick={() => { setSection(id); setTransactionForm(undefined); clearNotice() }}>
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
          <div className="mobile-brand"><span className="brand-mark"><Logo /></span> Ledgerly</div>
          <div className="breadcrumb">Finance <ChevronRight size={14} /> <strong>{activeSection?.label}</strong></div>
          <div className="topbar-right">
            <span className="local-status" title={email}><span /> {userName}</span>
            <button className="button button-secondary button-signout" onClick={() => void signOut()} aria-label="Sign out"><LogOut size={16} /><span>Sign out</span></button>
            <button className="button button-primary top-add" onClick={() => { setSection('transactions'); setTransactionForm(null) }}><Plus size={16} /> Add transaction</button>
          </div>
        </header>

        <main className="page-content">
          <Notice error={notice.error} success={notice.success} />
          {section === 'overview' && <OverviewPage year={year} onYearChange={setYear} onNavigate={setSection} onEditTransaction={setTransactionForm} />}
          {section === 'transactions' && <TransactionsPage year={year} onYearChange={setYear} transactionForm={transactionForm} onOpenForm={setTransactionForm} onCloseForm={() => setTransactionForm(undefined)} onSave={saveTransaction} />}
          {section === 'reports' && <ReportsPage report={report} onEditTransaction={(item) => { setSection('transactions'); setTransactionForm(item) }} />}
          {section === 'accounts' && <AccountsPage />}
          {section === 'deposits' && <DepositsPage />}
          {section === 'settings' && <SettingsPage fullName={fullName} email={email} onSaveName={onUpdateName} onAccountDeleted={() => onSignOut({ local: true })} />}
        </main>
        <footer className="app-footer"><span>Ledgerly · Personal Finance Tracker · <span title="Release and commit this build was made from">{appVersion}</span></span><span><LockKeyhole size={13} /> Stored in your private account</span></footer>
      </div>

      {transactionForm !== undefined && section === 'overview' && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setTransactionForm(undefined) }}>
          <div className="modal-content"><TransactionForm transaction={transactionForm} accounts={accounts} categories={categories} transactions={overviewTransactions} onCancel={() => setTransactionForm(undefined)} onSave={saveTransaction} /></div>
        </div>
      )}
    </div>
  )
}
