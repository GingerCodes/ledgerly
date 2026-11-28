// @vitest-environment jsdom
import { createRequire } from 'node:module'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { FinanceProvider } from '../../app/FinanceProvider'
import { FinanceDatabase } from '../../data/finance-database'
import { makePeriod } from '../../lib/period'
import { fakeSupabase } from '../../test-support/fake-supabase'
import { TransactionsPage } from './TransactionsPage'

vi.mock('sql.js/dist/sql-wasm.wasm?url', () => ({
  default: createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm'),
}))

const row = (id: string, description: string) => ({
  id, date: '2026-03-05', type: 'expense', account_id: 'CASH', from_account_id: null, to_account_id: null,
  description, amount_paise: 1000, category_id: null, notes: '', created_at: '2026-03-05T00:00:00Z', updated_at: '2026-03-05T00:00:00Z',
})

describe('transaction search', () => {
  it('shows a clear button only while there is text, and clearing restores every transaction', async () => {
    const database = await FinanceDatabase.open(fakeSupabase({ transactions: [row('a', 'Groceries'), row('b', 'Taxi')] }), 'search-user')
    render(
      <MemoryRouter>
        <FinanceProvider database={database}>
          <TransactionsPage period={makePeriod('calendar', 2026)} onYearChange={() => undefined} transactionForm={undefined} onOpenForm={() => undefined} onCloseForm={() => undefined} onSave={async () => undefined} />
        </FinanceProvider>
      </MemoryRouter>,
    )
    const input = screen.getByRole('textbox', { name: 'Search descriptions' })
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull()

    fireEvent.change(input, { target: { value: 'tax' } })
    await waitFor(() => expect(screen.queryByText('Groceries')).toBeNull())
    expect(screen.getByText('Taxi')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect((input as HTMLInputElement).value).toBe('')
    await waitFor(() => expect(screen.getByText('Groceries')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull()
    expect(document.activeElement).toBe(input)

    fireEvent.change(input, { target: { value: 'gro' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect((input as HTMLInputElement).value).toBe('')
    await database.close()
  })
})
