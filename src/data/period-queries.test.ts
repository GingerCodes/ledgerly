import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'
import { fakeSupabase } from '../test-support/fake-supabase'
import { FinanceDatabase } from './finance-database'

vi.mock('sql.js/dist/sql-wasm.wasm?url', () => ({
  default: createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm'),
}))

const tx = (id: string, date: string, type: 'expense' | 'income', amount: number) => ({
  id, date, type, account_id: type === 'expense' ? 'CASH' : 'SB1', from_account_id: null, to_account_id: null,
  description: `tx ${id}`, amount_paise: amount, category_id: null, notes: '', created_at: `${date}T00:00:00Z`, updated_at: `${date}T00:00:00Z`,
})

describe('period queries', () => {
  it('includes both boundary dates of a financial year and nothing outside it', async () => {
    const database = await FinanceDatabase.open(fakeSupabase({
      transactions: [
        tx('before', '2026-03-31', 'expense', 100),
        tx('first', '2026-04-01', 'expense', 200),
        tx('income', '2026-12-25', 'income', 5000),
        tx('last', '2027-03-31', 'expense', 400),
        tx('after', '2027-04-01', 'expense', 800),
      ],
    }), 'period-user')

    expect(database.getTransactions('2026-04-01', '2027-03-31').map((item) => item.id).sort()).toEqual(['first', 'income', 'last'])
    expect(database.getPeriodSummary('2026-04-01', '2027-03-31')).toMatchObject({ expensePaise: 600, incomePaise: 5000, transactionCount: 3 })
    expect(database.getTransactions('2026-04-01', '2027-03-31', 'tx last').map((item) => item.id)).toEqual(['last'])
    expect(database.getRecentTransactions(2).map((item) => item.id)).toEqual(['after', 'last'])
    await database.close()
  })
})
