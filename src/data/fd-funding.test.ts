import { createRequire } from 'node:module'
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { FinanceDatabase } from './finance-database'

vi.mock('sql.js/dist/sql-wasm.wasm?url', () => ({
  default: createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm'),
}))

const account = (id: string, name: string, openingBalancePaise: number) => ({
  id, name, type: id === 'CASH' ? 'cash' : 'savings', institution: id === 'CASH' ? '' : 'HDFC',
  account_number: id === 'CASH' ? '' : `0000${id}`, status: 'active', opening_date: '2026-01-01',
  opening_balance_paise: openingBalancePaise, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
})

const fakeClient = {
  rpc: async (name: string) => name === 'finance_load_snapshot'
    ? {
      data: {
        revision: 1,
        accounts: [account('CASH', 'Cash', 0), account('SB1', 'Savings', 1_000_000)],
        categories: [{ id: 'food', name: 'Food', parent_category_id: null, active: true }],
        transactions: [], fixed_deposits: [], balance_snapshots: [], transaction_changes: [],
      },
      error: null,
    }
    : { data: 2, error: null },
} as unknown as SupabaseClient

const deposit = (principalPaise: number, fundingAccountId: string | null) => ({
  institution: 'SBI', accountNumber: 'FD-1', principalPaise, startDate: '2026-03-01', maturityDate: '2027-03-01',
  annualRateBasisPoints: 700, interestType: 'simple' as const, compoundsPerYear: 1, linkedAccountId: null,
  fundingAccountId, maturityInstruction: '', notes: '',
})

describe('fixed deposit funding', () => {
  it('debits the funding account, rejects overdrafts, and requires a source for new deposits', async () => {
    const database = await FinanceDatabase.open(fakeClient, 'user-1')
    const balance = () => database.getAccounts().find((item) => item.id === 'SB1')!.currentBalancePaise

    const id = await database.saveFixedDeposit(deposit(400_000, 'SB1'))
    expect(balance()).toBe(600_000)

    await expect(database.saveFixedDeposit(deposit(700_000, 'SB1'))).rejects.toThrow('Not enough balance')
    expect(balance()).toBe(600_000)

    await expect(database.saveFixedDeposit(deposit(100_000, null))).rejects.toThrow('Choose the savings account')
    await expect(database.saveFixedDeposit(deposit(100_000, 'CASH'))).rejects.toThrow('active savings account')

    await database.saveFixedDeposit({ ...deposit(500_000, 'SB1'), id })
    expect(balance()).toBe(500_000)
    await database.close()
  })
})
