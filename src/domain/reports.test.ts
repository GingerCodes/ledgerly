import { describe, expect, it } from 'vitest'
import { summarizeExpenseReport } from './reports'
import type { Category, Transaction } from './models'

describe('expense report summaries', () => {
  it('totals expenses by month and category path while excluding income', () => {
    const categories: Category[] = [
      { id: 'food', name: 'Food', parentCategoryId: null, active: true },
      { id: 'grocery', name: 'Groceries', parentCategoryId: 'food', active: true },
    ]
    const transactions: Transaction[] = [
      { id: 'one', date: '2026-01-03', type: 'expense', accountId: 'CASH', fromAccountId: null, toAccountId: null, description: 'Market', amountPaise: 1200, categoryId: 'grocery', notes: '', createdAt: '', updatedAt: '' },
      { id: 'two', date: '2026-02-03', type: 'expense', accountId: 'CASH', fromAccountId: null, toAccountId: null, description: 'Cafe', amountPaise: 800, categoryId: 'food', notes: '', createdAt: '', updatedAt: '' },
      { id: 'three', date: '2026-02-04', type: 'expense', accountId: 'CASH', fromAccountId: null, toAccountId: null, description: 'Other', amountPaise: 500, categoryId: null, notes: '', createdAt: '', updatedAt: '' },
      { id: 'income', date: '2026-02-05', type: 'income', accountId: 'CASH', fromAccountId: null, toAccountId: null, description: 'Refund', amountPaise: 10000, categoryId: null, notes: '', createdAt: '', updatedAt: '' },
    ]

    expect(summarizeExpenseReport(transactions, categories)).toEqual({
      totalPaise: 2500,
      transactionCount: 3,
      categoryBreakdown: [
        { categoryId: 'grocery', categoryPath: 'Food > Groceries', amountPaise: 1200, transactionCount: 1 },
        { categoryId: 'food', categoryPath: 'Food', amountPaise: 800, transactionCount: 1 },
        { categoryId: null, categoryPath: 'Uncategorized', amountPaise: 500, transactionCount: 1 },
      ],
      monthlyBreakdown: [
        { month: '2026-01', amountPaise: 1200, transactionCount: 1 },
        { month: '2026-02', amountPaise: 1300, transactionCount: 2 },
      ],
    })
  })
})
