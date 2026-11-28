// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Account } from '../../domain/models'

let accounts: Account[] = []
vi.mock('../../app/finance-context', () => ({
  useFinance: () => ({ accounts, deposits: [] }),
  useFinanceQuery: () => [],
}))

import { SummaryCards } from './SummaryCards'
import { UpcomingPanel } from './UpcomingPanel'

afterEach(cleanup)

const account = (id: string, balance: number, type: Account['type'] = 'savings', status: Account['status'] = 'active'): Account => ({
  id, name: `Acct ${id}`, type, institution: '', accountNumber: '', status, openingDate: '2026-01-01', openingBalancePaise: balance, currentBalancePaise: balance, createdAt: '', updatedAt: '',
})
const empty = { incomePaise: 0, expensePaise: 0, expensesByCategory: [] } as never

describe('SummaryCards', () => {
  it('titles the cards without repeating the month', () => {
    accounts = []
    render(<SummaryCards month="2026-11" summary={empty} previous={empty} />)
    for (const title of ['Net worth', 'Income', 'Expenses', 'Saved']) expect(screen.getByText(title)).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/·\s*November/)
  })
})

describe('UpcomingPanel', () => {
  it('lists active savings accounts by balance, five at most, with a +N more link', () => {
    accounts = [1, 2, 3, 4, 5, 6, 7].map((n) => account(String(n), n * 1000)).concat(account('c', 99999, 'cash'), account('x', 88888, 'savings', 'inactive'))
    render(<UpcomingPanel onNavigate={() => undefined} />)
    const names = screen.getAllByText(/^Acct \d$/).map((node) => node.textContent)
    expect(names).toEqual(['Acct 7', 'Acct 6', 'Acct 5', 'Acct 4', 'Acct 3'])
    expect(screen.getByRole('button', { name: '+2 more' })).toBeTruthy()
  })

  it('shows one plain line, not the empty block, when nothing matures', () => {
    accounts = [account('1', 5000)]
    render(<UpcomingPanel onNavigate={() => undefined} />)
    expect(screen.getByText('No deposits maturing in the next 90 days.').className).toBe('upcoming-none')
  })
})
