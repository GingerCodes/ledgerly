import { describe, expect, it } from 'vitest'
import type { Account, Transaction } from './models'
import { categoryForDescription, defaultAccountId, topCategoryIds } from './transaction-suggestions'

const tx = (id: string, date: string, over: Partial<Transaction> = {}): Transaction => ({
  id, date, type: 'expense', accountId: 'CASH', fromAccountId: null, toAccountId: null, description: 'x', amountPaise: 100, categoryId: null, notes: '', createdAt: `${date}T00:00:00Z`, updatedAt: '', ...over,
})
const acct = (id: string, status: Account['status'] = 'active'): Account => ({ id, name: id, type: id === 'CASH' ? 'cash' : 'savings', institution: '', accountNumber: '', status, openingDate: '2026-01-01', openingBalancePaise: 0, currentBalancePaise: 0, createdAt: '', updatedAt: '' })

describe('topCategoryIds', () => {
  const all = new Set(['food', 'rent', 'fuel', 'gone'])
  it('orders by use, breaks ties by most recent, and only counts the given type and allowed categories', () => {
    const items = [
      tx('1', '2026-11-01', { categoryId: 'food' }), tx('2', '2026-11-02', { categoryId: 'food' }),
      tx('3', '2026-11-03', { categoryId: 'rent' }), tx('4', '2026-11-09', { categoryId: 'fuel' }),
      tx('5', '2026-11-05', { categoryId: 'food', type: 'income' }), tx('6', '2026-11-06', { categoryId: 'gone' }),
    ]
    expect(topCategoryIds(items, 'expense', new Set(['food', 'rent', 'fuel']), 5)).toEqual(['food', 'fuel', 'rent'])
    expect(topCategoryIds(items, 'expense', all, 2)).toEqual(['food', 'fuel'])
    expect(topCategoryIds(items, 'income', all, 5)).toEqual(['food'])
  })
})

describe('defaultAccountId', () => {
  it('uses the account of the newest transaction, skipping inactive accounts', () => {
    const accounts = [acct('CASH'), acct('SB1'), acct('SB2', 'inactive')]
    expect(defaultAccountId([tx('1', '2026-11-01'), tx('2', '2026-11-05', { accountId: 'SB1' })], accounts)).toBe('SB1')
    expect(defaultAccountId([tx('2', '2026-11-05', { accountId: 'SB2' }), tx('1', '2026-11-01', { accountId: 'SB1' })], accounts)).toBe('SB1')
  })
  it('falls back to Cash, then the first active account, then empty', () => {
    expect(defaultAccountId([], [acct('SB1'), acct('CASH')])).toBe('CASH')
    expect(defaultAccountId([], [acct('SB1'), acct('SB2')])).toBe('SB1')
    expect(defaultAccountId([], [])).toBe('')
  })
})

describe('categoryForDescription', () => {
  it('returns the category from the latest transaction with that description, ignoring case', () => {
    const items = [tx('1', '2026-10-01', { description: 'Milk', categoryId: 'old' }), tx('2', '2026-11-01', { description: 'milk ', categoryId: 'food' })]
    expect(categoryForDescription(items, 'MILK')).toBe('food')
    expect(categoryForDescription(items, 'bread')).toBeNull()
    expect(categoryForDescription(items, '  ')).toBeNull()
  })
})
