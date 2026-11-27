import { createRequire } from 'node:module'
import { renderToString } from 'react-dom/server'
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
import { SettingsPage } from '../features/settings/SettingsPage'
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
  return <ReportsPage report={useExpenseReport()} onEditTransaction={() => undefined} />
}

/** Server-renders each page against a real in-memory database to catch wiring mistakes after refactors. */
describe('pages render', () => {
  it('renders every page with the shared finance context', async () => {
    const database = await FinanceDatabase.open(fakeSupabase(snapshot), 'smoke-user')
    const render = (page: React.ReactNode) => renderToString(<FinanceProvider database={database}>{page}</FinanceProvider>)

    expect(render(<OverviewPage year={2026} onYearChange={() => undefined} onNavigate={() => undefined} onEditTransaction={() => undefined} />)).toContain('Cash + savings')
    const transactions = render(<TransactionsPage year={2026} onYearChange={() => undefined} transactionForm={undefined} onOpenForm={() => undefined} onCloseForm={() => undefined} onSave={async () => undefined} />)
    expect(transactions).toContain('Groceries')
    expect(render(<TransactionsPage year={2026} onYearChange={() => undefined} transactionForm={null} onOpenForm={() => undefined} onCloseForm={() => undefined} onSave={async () => undefined} />)).toContain('add another')
    expect(render(<ReportsHarness />)).toContain('Generate report')
    expect(render(<AccountsPage />)).toContain('Balance snapshots')
    const deposits = render(<DepositsPage />)
    expect(deposits).toContain('Funded from')
    expect(deposits).toContain('HDFC')
    expect(render(<CategoriesPage />)).toContain('Food')
    expect(render(<SettingsPage fullName="Alex Jose" email="me@example.com" onSaveName={async () => null} onAccountDeleted={async () => null} />)).toContain('Backup &amp; import')
    expect(render(<BackupPage />)).toContain('Import transactions from CSV')

    const shell = render(<AppShell userName="Alex Jose" fullName="Alex Jose" email="me@example.com" onSignOut={async () => null} onUpdateName={async () => null} />)
    expect(shell).toContain('Alex Jose')
    expect(shell).toContain('Fixed deposits')
    expect(shell).toContain('Settings')
    await database.close()
  })
})
