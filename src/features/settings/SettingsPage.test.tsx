// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { FinanceContext, type FinanceContextValue } from '../../app/finance-context'
import type { FinanceDatabase } from '../../data/finance-database'
import { SettingsPage } from './SettingsPage'

afterEach(cleanup)

const noop = () => undefined
// Settings only reads these lists on first render; the database is untouched until a button is clicked.
const finance: FinanceContextValue = {
  database: {} as FinanceDatabase,
  revision: 0,
  accounts: [],
  categories: [{ id: 'food', name: 'Food', parentCategoryId: null, active: true }],
  deposits: [],
  snapshots: [],
  notice: { error: '', success: '' },
  refresh: noop,
  runAction: async () => undefined,
  showSuccess: noop,
  showError: noop,
  clearNotice: noop,
}

function renderSettings() {
  return render(<FinanceContext.Provider value={finance}><SettingsPage fullName="Alex Jose" email="me@example.com" onSaveName={async () => null} onAccountDeleted={async () => null} /></FinanceContext.Provider>)
}

describe('SettingsPage', () => {
  it('shows categories first and switches tabs', async () => {
    renderSettings()
    expect(screen.getByRole('tab', { name: 'Categories' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByText('Food').length).toBeGreaterThan(0)
    expect(screen.queryByText('Take your data with you')).toBeNull()

    await userEvent.click(screen.getByRole('tab', { name: 'Backup & import' }))
    expect(screen.getByRole('tab', { name: 'Backup & import' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Take your data with you')).toBeTruthy()
    expect(screen.queryAllByText('Food')).toHaveLength(0)

    await userEvent.click(screen.getByRole('tab', { name: 'Account' }))
    expect(screen.getByRole('button', { name: 'Delete my account' })).toBeTruthy()
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Alex Jose')
  })
})
