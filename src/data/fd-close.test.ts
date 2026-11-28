import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'
import { fakeSupabase, testAccount, type FakeSupabaseOptions } from '../test-support/fake-supabase'
import { FinanceDatabase } from './finance-database'

vi.mock('sql.js/dist/sql-wasm.wasm?url', () => ({
  default: createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm'),
}))

const deposit = { institution: 'SBI', accountNumber: 'FD-1234', principalPaise: 400_000, startDate: '2026-03-01', maturityDate: '2027-03-01', annualRateBasisPoints: 700, interestType: 'simple' as const, compoundsPerYear: 1, linkedAccountId: null, fundingAccountId: 'SB1', maturityInstruction: '', notes: '' }
let counter = 0
async function open() {
  const applied: NonNullable<FakeSupabaseOptions['applied']> = []
  const database = await FinanceDatabase.open(
    fakeSupabase({ accounts: [testAccount('CASH', 'Cash', 0), testAccount('SB1', 'Savings', 1_000_000), testAccount('SB2', 'Other savings', 0)] }, { applied }),
    `fd-close-user-${++counter}`,
  )
  applied.length = 0
  return { database, applied }
}
const balance = (database: FinanceDatabase, id: string) => database.getAccounts().find((item) => item.id === id)!.currentBalancePaise

describe('closing a fixed deposit', () => {
  it('returns the principal to the account and records the interest as income', async () => {
    const { database, applied } = await open()
    const id = await database.saveFixedDeposit(deposit)
    expect(balance(database, 'SB1')).toBe(600_000)
    applied.length = 0

    await database.closeFixedDeposit(id, { date: '2027-03-01', accountId: 'SB1', interestPaise: 28_000 })
    expect(balance(database, 'SB1')).toBe(1_028_000) // 1,000,000 opening + 28,000 interest; principal is back
    expect(database.getFixedDeposits()[0]).toMatchObject({ status: 'closed', closedDate: '2027-03-01' })
    const income = database.getTransactions('2027-03-01', '2027-03-01')
    expect(income).toHaveLength(1)
    expect(income[0]).toMatchObject({ type: 'income', accountId: 'SB1', amountPaise: 28_000 })
    expect(income[0].description).toContain('SBI')
    expect(applied).toHaveLength(1) // closing and the interest entry are saved together
    await database.close()
  })

  it('credits another account when the money was paid there, and records no entry for zero interest', async () => {
    const { database } = await open()
    const id = await database.saveFixedDeposit(deposit)
    await database.closeFixedDeposit(id, { date: '2027-03-01', accountId: 'SB2', interestPaise: 0 })
    expect(balance(database, 'SB1')).toBe(600_000)
    expect(balance(database, 'SB2')).toBe(400_000)
    expect(database.getTransactions('2027-01-01', '2027-12-31')).toHaveLength(0)
    await database.close()
  })

  it('shows the principal back in balance snapshots only from the closing date', async () => {
    const { database } = await open()
    const id = await database.saveFixedDeposit(deposit)
    await database.closeFixedDeposit(id, { date: '2026-09-01', accountId: 'SB1', interestPaise: 0 })
    await database.saveBalanceSnapshot({ accountId: 'SB1', date: '2026-08-31', reportedBalancePaise: 600_000, source: 'Statement', notes: '' })
    await database.saveBalanceSnapshot({ accountId: 'SB1', date: '2026-09-01', reportedBalancePaise: 1_000_000, source: 'Statement', notes: '' })
    const calculated = Object.fromEntries(database.getBalanceSnapshots().map((item) => [item.date, item.calculatedBalancePaise]))
    expect(calculated).toEqual({ '2026-08-31': 600_000, '2026-09-01': 1_000_000 })
    await database.close()
  })

  it('refuses invalid closes and closing twice', async () => {
    const { database } = await open()
    const id = await database.saveFixedDeposit(deposit)
    await expect(database.closeFixedDeposit(id, { date: '2026-02-01', accountId: 'SB1', interestPaise: 0 })).rejects.toThrow('before it started')
    await expect(database.closeFixedDeposit(id, { date: '2027-03-01', accountId: 'CASH', interestPaise: 0 })).rejects.toThrow('savings account')
    await expect(database.closeFixedDeposit(id, { date: '2027-03-01', accountId: 'SB1', interestPaise: -1 })).rejects.toThrow('negative')
    await database.closeFixedDeposit(id, { date: '2027-03-01', accountId: 'SB1', interestPaise: 0 })
    await expect(database.closeFixedDeposit(id, { date: '2027-03-02', accountId: 'SB1', interestPaise: 0 })).rejects.toThrow('not found')
    expect(database.getFixedDeposits()[0].status).toBe('closed') // failed attempts changed nothing
    await database.close()
  })

  it('sends the new app version so older cached copies are refused', async () => {
    const { database, applied } = await open()
    await database.saveFixedDeposit(deposit)
    expect(applied[0].changes.client_api_version).toBe(3)
    await database.close()
  })
})
