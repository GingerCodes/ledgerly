import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'
import { fakeSupabase } from '../test-support/fake-supabase'
import { FinanceDatabase } from './finance-database'

vi.mock('sql.js/dist/sql-wasm.wasm?url', () => ({
  default: createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm'),
}))

const deposit = (principalPaise: number, fundingAccountId: string | null) => ({
  institution: 'SBI', accountNumber: 'FD-1', principalPaise, startDate: '2026-03-01', maturityDate: '2027-03-01',
  annualRateBasisPoints: 700, interestType: 'simple' as const, compoundsPerYear: 1, linkedAccountId: null,
  fundingAccountId, maturityInstruction: '', notes: '',
})

describe('fixed deposit funding', () => {
  it('debits the funding account, rejects overdrafts, and allows a new deposit with no source', async () => {
    const database = await FinanceDatabase.open(fakeSupabase(), 'user-1')
    const balance = () => database.getAccounts().find((item) => item.id === 'SB1')!.currentBalancePaise

    const id = await database.saveFixedDeposit(deposit(400_000, 'SB1'))
    expect(balance()).toBe(600_000)

    await expect(database.saveFixedDeposit(deposit(700_000, 'SB1'))).rejects.toThrow('Not enough balance')
    expect(balance()).toBe(600_000)

    // a deposit with no source (for example one that started before the user began using the app) takes nothing from any account
    await database.saveFixedDeposit(deposit(100_000, null))
    expect(balance()).toBe(600_000)
    expect(database.getAccounts().find((item) => item.id === 'CASH')!.currentBalancePaise).toBe(0)
    await expect(database.saveFixedDeposit(deposit(100_000, 'CASH'))).rejects.toThrow('active savings account')

    await database.saveFixedDeposit({ ...deposit(500_000, 'SB1'), id })
    expect(balance()).toBe(500_000)
    await database.close()
  })
})
