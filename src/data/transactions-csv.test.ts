import { describe, expect, it } from 'vitest'
import { exportTransactionsCsv, parseTransactionsCsv } from './transactions-csv'
import type { Transaction } from '../domain/models'

const accounts = new Set(['CASH', 'savings'])
const categories = new Set(['food'])

describe('year-wise transaction CSV', () => {
  it('exports and imports quoted descriptions, notes, and transfer legs', () => {
    const transactions: Transaction[] = [
      {
        id: 'expense-1',
        date: '2026-03-10',
        type: 'expense',
        accountId: 'CASH',
        fromAccountId: null,
        toAccountId: null,
        description: 'Lunch, with a friend',
        amountPaise: 12550,
        categoryId: 'food',
        notes: 'Paid "in cash"',
        createdAt: '2026-03-10T12:00:00.000Z',
        updatedAt: '2026-03-10T12:00:00.000Z',
      },
      {
        id: 'transfer-1',
        date: '2026-03-11',
        type: 'transfer',
        accountId: null,
        fromAccountId: 'savings',
        toAccountId: 'CASH',
        description: 'ATM withdrawal',
        amountPaise: 500000,
        categoryId: null,
        notes: '',
        createdAt: '2026-03-11T12:00:00.000Z',
        updatedAt: '2026-03-11T12:00:00.000Z',
      },
    ]

    const csv = exportTransactionsCsv(transactions)
    const result = parseTransactionsCsv(csv, accounts, categories)

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.validRows.map((row) => row.transaction)).toEqual([
      {
        id: 'expense-1',
        date: '2026-03-10',
        type: 'expense',
        accountId: 'CASH',
        fromAccountId: null,
        toAccountId: null,
        description: 'Lunch, with a friend',
        amountPaise: 12550,
        categoryId: 'food',
        notes: 'Paid "in cash"',
      },
      {
        id: 'transfer-1',
        date: '2026-03-11',
        type: 'transfer',
        accountId: null,
        fromAccountId: 'savings',
        toAccountId: 'CASH',
        description: 'ATM withdrawal',
        amountPaise: 500000,
        categoryId: null,
        notes: '',
      },
    ])
  })

  it('rejects invalid dates, and unknown accounts before import', () => {
    const csv = [
      'transaction_id,date,type,account_id,from_account_id,to_account_id,description,amount,category_id,notes',
      'bad-date,2026-02-30,expense,CASH,,,Groceries,10.00,food,',
      'unknown-account,2026-02-02,income,missing,,,Interest,10.00,,',
    ].join('\n')

    const result = parseTransactionsCsv(csv, accounts, categories)
    expect(result.validRows).toEqual([])
    expect(result.errors).toHaveLength(2)
  })

  it('requires the complete interchange schema', () => {
    const result = parseTransactionsCsv('date,description\n2026-01-01,Missing fields', accounts, categories)
    expect(result.validRows).toEqual([])
    expect(result.errors).toContain('Missing required CSV column: transaction_id')
  })

  it('exports formula-looking text as plain text and reads it back unchanged', () => {
    const base = { type: 'expense' as const, accountId: 'CASH', fromAccountId: null, toAccountId: null, amountPaise: 1000, categoryId: null, createdAt: '2026-03-10T12:00:00.000Z', updatedAt: '2026-03-10T12:00:00.000Z' }
    const transactions: Transaction[] = [
      { ...base, id: 'formula-1', date: '2026-03-10', description: '=HYPERLINK("http://evil.example","click")', notes: '+1 and -2 and @me' },
    ]
    const csv = exportTransactionsCsv(transactions)
    expect(csv).toContain(`'=HYPERLINK`)
    expect(csv).not.toMatch(/,=HYPERLINK|,"=HYPERLINK/)

    const result = parseTransactionsCsv(csv, accounts, categories)
    expect(result.errors).toEqual([])
    expect(result.validRows[0].transaction.description).toBe('=HYPERLINK("http://evil.example","click")')
    expect(result.validRows[0].transaction.notes).toBe('+1 and -2 and @me')
  })
})
