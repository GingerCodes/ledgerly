import { describe, expect, it } from 'vitest'
import {
  accountLabel,
  calculateAccountBalances,
  categoryDescendantIds,
  categoryPath,
  estimateFixedDepositMaturityValue,
  parseNonNegativeRupeesToPaise,
  parseRupeesToPaise,
  type Account,
  type Category,
  type FixedDeposit,
  type Transaction,
} from './models'

describe('INR amount parsing', () => {
  it('converts decimal rupees to integer paise', () => {
    expect(parseRupeesToPaise('1250.5')).toBe(125050)
    expect(parseRupeesToPaise('0.01')).toBe(1)
  })

  it('accepts a zero opening balance but rejects negative and malformed values', () => {
    expect(parseNonNegativeRupeesToPaise('0')).toBe(0)
    expect(() => parseNonNegativeRupeesToPaise('-1')).toThrow()
    expect(() => parseRupeesToPaise('1.234')).toThrow()
  })
})

describe('category paths', () => {
  const categories: Category[] = [
    { id: 'food', name: 'Food', parentCategoryId: null, active: true },
    { id: 'groceries', name: 'Groceries', parentCategoryId: 'food', active: true },
  ]

  it('resolves nested labels and uncategorized transactions', () => {
    expect(categoryPath('groceries', categories)).toBe('Food > Groceries')
    expect(categoryPath(null, categories)).toBe('Uncategorized')
  })

  it('detects an invalid category cycle', () => {
    const cycle = [
      { id: 'a', name: 'A', parentCategoryId: 'b', active: true },
      { id: 'b', name: 'B', parentCategoryId: 'a', active: true },
    ]
    expect(() => categoryPath('a', cycle)).toThrow('cycle')
  })

  it('returns a selected category and all nested descendants, excluding siblings', () => {
    const tree = [
      ...categories,
      { id: 'produce', name: 'Produce', parentCategoryId: 'groceries', active: true },
      { id: 'travel', name: 'Travel', parentCategoryId: null, active: true },
    ]

    expect(categoryDescendantIds('food', tree)).toEqual(['food', 'groceries', 'produce'])
  })
})

describe('account balances', () => {
  it('applies income, cash expenses, and transfers without treating transfers as expenses', () => {
    const accounts: Account[] = [
      { id: 'CASH', name: 'Cash', type: 'cash', institution: '', accountNumber: '', status: 'active', openingDate: '2026-01-01', openingBalancePaise: 10000, currentBalancePaise: 0, createdAt: '', updatedAt: '' },
      { id: 'bank', name: 'Bank', type: 'savings', institution: 'Bank', accountNumber: '1234', status: 'active', openingDate: '2026-01-01', openingBalancePaise: 50000, currentBalancePaise: 0, createdAt: '', updatedAt: '' },
    ]
    const transactions: Transaction[] = [
      { id: '1', date: '2026-01-01', type: 'expense', accountId: 'CASH', fromAccountId: null, toAccountId: null, description: 'Lunch', amountPaise: 2000, categoryId: null, notes: '', createdAt: '', updatedAt: '' },
      { id: '2', date: '2026-01-02', type: 'transfer', accountId: null, fromAccountId: 'bank', toAccountId: 'CASH', description: 'ATM withdrawal', amountPaise: 5000, categoryId: null, notes: '', createdAt: '', updatedAt: '' },
      { id: '3', date: '2026-01-03', type: 'income', accountId: 'bank', fromAccountId: null, toAccountId: null, description: 'Interest', amountPaise: 1000, categoryId: null, notes: '', createdAt: '', updatedAt: '' },
    ]

    expect(calculateAccountBalances(accounts, transactions)).toEqual(new Map([
      ['CASH', 13000],
      ['bank', 46000],
    ]))
  })
})

describe('fixed-deposit estimates', () => {
  it('calculates a simple-interest estimate from principal and term', () => {
    const deposit: FixedDeposit = {
      id: 'fd',
      institution: 'Bank',
      accountNumber: 'FD-1',
      principalPaise: 100000,
      startDate: '2025-01-01',
      maturityDate: '2026-01-01',
      annualRateBasisPoints: 1000,
      interestType: 'simple',
      compoundsPerYear: 1,
      linkedAccountId: null,
      fundingAccountId: null,
      maturityInstruction: '',
      status: 'active',
      notes: '',
      createdAt: '',
      updatedAt: '',
    }

    expect(estimateFixedDepositMaturityValue(deposit)).toBe(110000)
  })
})

describe('account labels', () => {
  it('uses bank and last four digits, falling back to the name', () => {
    expect(accountLabel({ name: 'Savings', institution: 'HDFC', accountNumber: '50100123451234' })).toBe('HDFC •••• 1234')
    expect(accountLabel({ name: 'Cash', institution: '', accountNumber: '' })).toBe('Cash')
  })
})
