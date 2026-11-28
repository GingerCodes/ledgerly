import { createRequire } from 'node:module'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { FinanceDatabase } from '../data/finance-database'
import { fakeSupabase } from '../test-support/fake-supabase'
import { AccountsPage } from '../features/accounts/AccountsPage'
import { BackupPage } from '../features/backup/BackupPage'
import { CategoriesPage } from '../features/categories/CategoriesPage'
import { DepositsPage } from '../features/deposits/DepositsPage'
import { OverviewPage } from '../features/overview/OverviewPage'
import { ReportsPage } from '../features/reports/ReportsPage'
import { useExpenseReport } from '../features/reports/useExpenseReport'
import { makePeriod } from '../lib/period'
import { TransactionsPage } from '../features/transactions/TransactionsPage'
import { AppShell } from './AppShell'
import { FinanceProvider } from './FinanceProvider'

vi.mock('sql.js/dist/sql-wasm.wasm?url', () => ({
  default: createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm'),
}))

const snapshot = {
  transactions: [{
    id: 't1', date: '2026-03-05', type: 'expense', account_id: 'CASH', from_account_id: null, to_account_id: null,
    description: 'Groceries', amount_paise: 25_000, category_id: 'food', notes: '',
    created_at: '2026-03-05T00:00:00Z', updated_at: '2026-03-05T00:00:00Z',
  }],
  fixed_deposits: [{
    id: 'fd1', institution: 'SBI', account_number: 'FD-1234', principal_paise: 400_000, start_date: '2026-03-01',
    maturity_date: '2027-03-01', annual_rate_basis_points: 700, interest_type: 'simple', compounds_per_year: 1,
    linked_account_id: null, funding_account_id: 'SB1', maturity_instruction: '', status: 'active', notes: '',
    created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
  }],
}

function ReportsHarness() {
  return <ReportsPage report={useExpenseReport('financial')} onEditTransaction={() => undefined} />
}

/** Server-renders each page against a real in-memory database to catch wiring mistakes after refactors. */
describe('pages render', () => {
  it('renders every page with the shared finance context', async () => {
    const database = await FinanceDatabase.open(fakeSupabase(snapshot), 'smoke-user')
    const render = (page: React.ReactNode, path = '/') => renderToString(<MemoryRouter initialEntries={[path]}><FinanceProvider database={database}>{page}</FinanceProvider></MemoryRouter>)

    expect(render(<OverviewPage period={makePeriod('financial', 2026)} onYearChange={() => undefined} onModeChange={() => undefined} onNavigate={() => undefined} onEditTransaction={() => undefined} />)).toContain('Net worth')
    const transactions = render(<TransactionsPage period={makePeriod('calendar', 2026)} onYearChange={() => undefined} onModeChange={() => undefined} transactionForm={undefined} onOpenForm={() => undefined} onCloseForm={() => undefined} onSave={async () => undefined} />)
    expect(transactions).toContain('Groceries')
    expect(render(<TransactionsPage period={makePeriod('calendar', 2026)} onYearChange={() => undefined} onModeChange={() => undefined} transactionForm={null} onOpenForm={() => undefined} onCloseForm={() => undefined} onSave={async () => undefined} />)).toContain('add another')
    // the form still suggests descriptions from earlier periods (the selected period 2020 has no transactions)
    const emptyPeriod = render(<TransactionsPage period={makePeriod('calendar', 2020)} onYearChange={() => undefined} onModeChange={() => undefined} transactionForm={null} onOpenForm={() => undefined} onCloseForm={() => undefined} onSave={async () => undefined} />)
    expect(emptyPeriod).toContain('No transactions found for this period')
    expect(emptyPeriod).toContain('<option value="Groceries"')
    expect(render(<ReportsHarness />)).toContain('Generate report')
    expect(render(<AccountsPage />)).toContain('Balance snapshots')
    const deposits = render(<DepositsPage />)
    expect(deposits).toContain('Funded from')
    expect(deposits).toContain('HDFC')
    expect(render(<CategoriesPage />)).toContain('Food')
    expect(render(<BackupPage />)).toContain('Import transactions from CSV')

    const shellAt = (path: string) => render(<AppShell userName="Alex Jose" fullName="Alex Jose" email="me@example.com" onSignOut={async () => null} onUpdateName={async () => null} />, path)
    // each URL renders its own screen
    expect(shellAt('/transactions')).toContain('Search descriptions')
    expect(shellAt('/reports')).toContain('Generate report')
    expect(shellAt('/accounts')).toContain('Balance snapshots')
    expect(shellAt('/deposits')).toContain('Funded from')
    expect(shellAt('/settings/categories')).toContain('Backup &amp; import')
    expect(shellAt('/settings/account')).toContain('Delete my account')
    const shell = shellAt('/overview')
    expect(shell).toContain('Alex Jose')
    expect(shell).toContain('me@example.com')
    expect(shell).toContain('Sign out')
    expect(shell).toContain('Fixed deposits')
    expect(shell).toContain('Settings')
    await database.close()
  })
})
