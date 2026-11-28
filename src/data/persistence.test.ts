import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'
import type { ImportedTransaction, TransactionInput } from '../domain/models'
import { fakeSupabase, testAccount, type FakeSupabaseOptions } from '../test-support/fake-supabase'
import { FinanceDatabase } from './finance-database'

vi.mock('sql.js/dist/sql-wasm.wasm?url', () => ({
  default: createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm'),
}))

let userCounter = 0
async function open(options: FakeSupabaseOptions = {}, snapshot: Record<string, unknown[]> = {}) {
  const applied: NonNullable<FakeSupabaseOptions['applied']> = []
  const database = await FinanceDatabase.open(fakeSupabase(snapshot, { ...options, applied }), `persist-user-${++userCounter}`)
  applied.length = 0 // ignore the first-run setup save
  return { database, applied }
}

const expense = (overrides: Partial<TransactionInput> = {}): TransactionInput => ({
  date: '2026-04-02', type: 'expense', accountId: 'CASH', fromAccountId: null, toAccountId: null,
  description: 'Tea', amountPaise: 2000, categoryId: 'food', notes: '', ...overrides,
})

describe('saving transactions', () => {
  it('stores a new transaction, records an edit with its reason, and rejects invalid ones', async () => {
    const { database, applied } = await open()
    const id = await database.saveTransaction(expense())
    expect(database.getTransactions('2026-04-01', '2026-04-30').map((item) => item.description)).toEqual(['Tea'])
    expect(applied[0].changes.transactions.upsert).toHaveLength(1)

    await database.saveTransaction(expense({ id, amountPaise: 3000 }), 'Fixed the price')
    const history = applied.at(-1)!.changes.transaction_changes.upsert
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ transaction_id: id, reason: 'Fixed the price' })
    expect(JSON.parse(history[0].changed_fields_json as string)).toEqual({ amountPaise: { before: 2000, after: 3000 } })

    const before = database.getAccounts().find((account) => account.id === 'SB1')!.currentBalancePaise
    await database.saveTransaction(expense({ accountId: 'SB1', amountPaise: 500 }))
    expect(database.getAccounts().find((account) => account.id === 'SB1')!.currentBalancePaise).toBe(before - 500)
    await expect(database.saveTransaction(expense({ type: 'transfer', accountId: null, fromAccountId: 'SB1', toAccountId: 'SB1', categoryId: null }))).rejects.toThrow('two different accounts')
    await expect(database.saveTransaction(expense({ amountPaise: 0 }))).rejects.toThrow('greater than zero')
    await database.close()
  })

  it('keeps balances and snapshot comparisons in step with transactions', async () => {
    const { database } = await open()
    await database.saveTransaction({ ...expense({ type: 'income', accountId: 'SB1', categoryId: null, description: 'Salary', amountPaise: 50_000 }), date: '2026-03-31' })
    await database.saveBalanceSnapshot({ accountId: 'SB1', date: '2026-04-01', reportedBalancePaise: 1_050_000, source: 'Statement', notes: '' })
    expect(database.getAccounts().find((item) => item.id === 'SB1')!.currentBalancePaise).toBe(1_050_000)
    expect(database.getBalanceSnapshots()[0]).toMatchObject({ reportedBalancePaise: 1_050_000, calculatedBalancePaise: 1_050_000 })
    await database.close()
  })
})

describe('categories and imports', () => {
  it('refuses to make a category its own descendant', async () => {
    const { database } = await open()
    const parent = await database.saveCategory({ name: 'Travel', parentCategoryId: null })
    const child = await database.saveCategory({ name: 'Trains', parentCategoryId: parent })
    await expect(database.saveCategory({ id: parent, name: 'Travel', parentCategoryId: child })).rejects.toThrow('own descendant')
    await database.close()
  })

  it('imports new rows, skips ids that already exist, and saves only the new ones', async () => {
    const { database, applied } = await open()
    const existing = await database.saveTransaction(expense({ description: 'Already here' }))
    applied.length = 0
    const row = (id: string, description: string): ImportedTransaction => ({ rowNumber: 2, transaction: { id, date: '2026-04-03', type: 'expense', accountId: 'CASH', fromAccountId: null, toAccountId: null, description, amountPaise: 1000, categoryId: null, notes: '' } })

    const result = await database.importTransactions([row(existing, 'Duplicate'), row('new-1', 'Fresh'), row('new-1', 'Same id twice')])
    expect(result).toEqual({ imported: 1, duplicates: 2 })
    expect(applied[0].changes.transactions.upsert.map((item) => item.id)).toEqual(['new-1'])
    await database.close()
  })
})

describe('saving to the server', () => {
  it('sends the app version so older cached copies can be refused', async () => {
    const { database, applied } = await open()
    await database.saveTransaction(expense())
    expect(applied[0].changes.client_api_version).toBe(3)
    await database.close()
  })

  it('tells the user to reload when the server says this version is out of date', async () => {
    const { database } = await open({ queue: { finance_apply_changes: [{ data: null, error: { message: 'FINANCE_OUTDATED: please reload' } }] } })
    await expect(database.saveTransaction(expense())).rejects.toThrow('out of date. Reload the page')
    expect(database.getTransactions('2026-04-01', '2026-04-30')).toHaveLength(0) // the local change was rolled back
    await database.close()
  })

  it('recovers when another tab set up a brand-new account first', async () => {
    const calls: string[] = []
    const seeded = { accounts: [testAccount('CASH', 'Cash on hand', 0)], categories: [{ id: 'food', name: 'Food', parent_category_id: null, active: true }] }
    const client = fakeSupabase({ accounts: [], categories: [] }, {
      calls,
      queue: {
        finance_apply_changes: [{ data: null, error: { message: 'FINANCE_CONFLICT: data changed in another session. Reload before saving.' } }],
        finance_load_snapshot: [
          { data: { revision: 0, accounts: [], categories: [], transactions: [], fixed_deposits: [], balance_snapshots: [], transaction_changes: [] }, error: null },
          { data: { revision: 1, ...seeded, transactions: [], fixed_deposits: [], balance_snapshots: [], transaction_changes: [] }, error: null },
        ],
      },
    })
    const database = await FinanceDatabase.open(client, 'first-run-race-user')
    expect(calls.filter((name) => name === 'finance_load_snapshot')).toHaveLength(2)
    expect(database.getAccounts().map((item) => item.id)).toEqual(['CASH'])
    await database.close()
  })
})
