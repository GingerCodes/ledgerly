// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

const onSignOut = vi.fn()

function Path() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

function renderSettings(startAt = '/settings/categories') {
  return render(
    <MemoryRouter initialEntries={[startAt]}>
      <FinanceContext.Provider value={finance}>
        <Routes>
          <Route path="/settings/:tab" element={<SettingsPage fullName="Alex Jose" email="me@example.com" onSaveName={async () => null} onSignOut={onSignOut} onAccountDeleted={async () => null} />} />
        </Routes>
        <Path />
      </FinanceContext.Provider>
    </MemoryRouter>,
  )
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
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(onSignOut).toHaveBeenCalledOnce()
  })

  it('keeps the selected tab in the URL, opens a tab straight from its URL, and fixes an unknown tab', async () => {
    renderSettings('/settings/account')
    expect(screen.getByRole('tab', { name: 'Account' }).getAttribute('aria-selected')).toBe('true')

    await userEvent.click(screen.getByRole('tab', { name: 'Backup & import' }))
    expect(screen.getByTestId('path').textContent).toBe('/settings/backups')

    cleanup()
    renderSettings('/settings/nonsense')
    expect(screen.getByTestId('path').textContent).toBe('/settings/categories')
  })
})
