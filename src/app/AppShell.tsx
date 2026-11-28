import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router'
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
import { currentPeriodYear, makePeriod, type PeriodMode } from '../lib/period'
import { trackPageView } from '../lib/analytics'
import { appVersion } from '../lib/version'
import { useFinance, useFinanceQuery } from './finance-context'
import { pageTitle, sectionOf, sections, type Section } from './navigation'

export function AppShell({ userName, fullName, email, onSignOut, onUpdateName, yearView, onUpdateYearView }: {
  /** Name for the top bar (falls back to the email). */
  userName: string
  /** The stored full name, or '' if none. */
  fullName: string
  email: string | undefined
  /** Resolves to the sign-out error, if any. */
  onSignOut: (options?: { local?: boolean }) => Promise<Error | null>
  onUpdateName: (name: string) => Promise<Error | null>
  /** Financial or calendar year, from the user's account preference. */
  yearView: PeriodMode
  onUpdateYearView: (mode: PeriodMode) => Promise<Error | null>
}) {
  const { database, accounts, categories, notice, clearNotice, runAction, showError } = useFinance()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const mode = yearView
  const [year, setYear] = useState(() => currentPeriodYear(mode))
  // Changing the preference moves every year-based view to the current period of the new kind.
  const [shownMode, setShownMode] = useState(mode)
  if (shownMode !== mode) {
    setShownMode(mode)
    setYear(currentPeriodYear(mode))
  }
  const period = makePeriod(mode, year)
  // The transaction form belongs to the screen it was opened on (null = new transaction, else the one being edited),
  // so it disappears when you leave that screen, including with the browser's back button.
  const [openForm, setOpenForm] = useState<{ transaction: Transaction | null; path: string } | null>(null)
  const transactionForm = openForm?.path === pathname ? openForm.transaction : undefined
  const showForm = (transaction: Transaction | null, path = pathname) => setOpenForm({ transaction, path })
  const closeForm = () => setOpenForm(null)
  const report = useExpenseReport(mode)
  const suggestions = useFinanceQuery((db) => db.getRecentTransactions(500), [])
  const activeSection = sections.find((item) => item.id === sectionOf(pathname))

  // One page view per real screen; paths that only redirect have no title and are skipped.
  useEffect(() => {
    const title = pageTitle(pathname)
    if (!title) return
    trackPageView(pathname, title)
    document.title = `${title} · Ledgerly`
  }, [pathname])

  async function saveTransaction(value: TransactionInput, reason: string, keepOpen: boolean) {
    await runAction(() => database.saveTransaction(value, reason), value.id ? 'Transaction updated.' : 'Transaction added.')
    if (!keepOpen) closeForm()
  }

  async function signOut() {
    const error = await onSignOut()
    if (error) showError(error)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/overview">
          <span className="brand-mark"><Logo /></span>
          <span><strong>Ledgerly</strong><small>PERSONAL FINANCE</small></span>
        </Link>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="side-nav" aria-label="Main navigation">
          {sections.map(({ id, label, icon: Icon, path }) => (
            <NavLink key={id} to={path} className={({ isActive }) => `nav-item ${isActive ? 'selected' : ''}`} onClick={() => { closeForm(); clearNotice() }}>
              {({ isActive }) => <><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{isActive && <ChevronRight className="nav-chevron" size={15} />}</>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {/* Hidden by CSS in the installed app and on phones, where Sign out lives in Settings -> Account. */}
          <div className="sidebar-user">
            <span className="sidebar-avatar" aria-hidden="true">{userName.charAt(0).toUpperCase()}</span>
            <span className="sidebar-user-text"><b>{userName}</b>{email && email !== userName && <small>{email}</small>}</span>
            <button type="button" className="button button-secondary sidebar-signout" onClick={() => void signOut()}><LogOut size={15} /> Sign out</button>
          </div>
          <div className="privacy-badge"><LockKeyhole size={16} /><span><b>Private by design</b><small>Protected by your account</small></span></div>
          <p className="sidebar-foot">Cloud-backed · INR only</p>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Logo /></span> Ledgerly</div>
          <div className="breadcrumb">Finance <ChevronRight size={14} /> <strong>{activeSection?.label}</strong></div>
          <div className="topbar-right">
            <button className="button button-primary top-add" onClick={() => { navigate('/transactions'); showForm(null, '/transactions') }}><Plus size={16} /> Add transaction</button>
          </div>
        </header>

        <main className="page-content">
          <Notice error={notice.error} success={notice.success} />
          <Routes>
            <Route path="/overview" element={<OverviewPage period={period} onYearChange={setYear} onNavigate={(section: Section) => navigate(`/${section}`)} onEditTransaction={(transaction) => showForm(transaction)} />} />
            <Route path="/transactions" element={<TransactionsPage period={period} onYearChange={setYear} transactionForm={transactionForm} onOpenForm={showForm} onCloseForm={closeForm} onSave={saveTransaction} />} />
            <Route path="/reports" element={<ReportsPage report={report} onEditTransaction={(item) => { navigate('/transactions'); showForm(item, '/transactions') }} />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/deposits" element={<DepositsPage />} />
            <Route path="/settings" element={<Navigate to="/settings/categories" replace />} />
            <Route path="/settings/:tab" element={<SettingsPage fullName={fullName} email={email} onSaveName={onUpdateName} yearView={yearView} onSaveYearView={onUpdateYearView} onSignOut={() => void signOut()} onAccountDeleted={() => onSignOut({ local: true })} />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </main>
        <footer className="app-footer"><span>Ledgerly · Personal Finance Tracker · <span title="Release and commit this build was made from">{appVersion}</span></span><span><LockKeyhole size={13} /> Stored in your private account</span></footer>
      </div>

      {transactionForm !== undefined && pathname === '/overview' && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm() }}>
          <div className="modal-content"><TransactionForm transaction={transactionForm} accounts={accounts} categories={categories} transactions={suggestions} onCancel={closeForm} onSave={saveTransaction} /></div>
        </div>
      )}
    </div>
  )
}
