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

  describe('a deposit with no source account', () => {
    const unfunded = { ...deposit, fundingAccountId: null, startDate: '2025-01-01', maturityDate: '2026-01-01' }

    it('takes nothing when added, and adds the principal to the receiving account only when the user says so', async () => {
      const { database } = await open()
      const id = await database.saveFixedDeposit(unfunded)
      expect(balance(database, 'SB1')).toBe(1_000_000) // nothing was debited

      await database.closeFixedDeposit(id, { date: '2026-01-01', accountId: 'SB1', interestPaise: 30_000, returnPrincipal: true })
      expect(database.getFixedDeposits()[0]).toMatchObject({ status: 'closed', principalReturned: true })
      expect(balance(database, 'SB1')).toBe(1_000_000 + 400_000 + 30_000) // principal and interest arrive
      await database.close()
    })

    it('credits only the interest when the box is left unticked, and funded deposits ignore the box', async () => {
      const { database } = await open()
      const id = await database.saveFixedDeposit(unfunded)
      await database.closeFixedDeposit(id, { date: '2026-01-01', accountId: 'SB1', interestPaise: 30_000, returnPrincipal: false })
      expect(database.getFixedDeposits()[0].principalReturned).toBe(false)
      expect(balance(database, 'SB1')).toBe(1_000_000 + 30_000)

      const funded = await database.saveFixedDeposit(deposit)
      await database.closeFixedDeposit(funded, { date: '2027-03-01', accountId: 'SB1', interestPaise: 0, returnPrincipal: true })
      expect(database.getFixedDeposits().find((item) => item.id === funded)!.principalReturned).toBe(false) // its principal comes back anyway
      expect(balance(database, 'SB1')).toBe(1_000_000 + 30_000)
      await database.close()
    })

    it('shows the returned principal in balance snapshots from the closing date, and keeps the flag through a save', async () => {
      const { database, applied } = await open()
      const id = await database.saveFixedDeposit(unfunded)
      await database.closeFixedDeposit(id, { date: '2026-01-01', accountId: 'SB1', interestPaise: 0, returnPrincipal: true })
      await database.saveBalanceSnapshot({ accountId: 'SB1', date: '2025-12-31', reportedBalancePaise: 1_000_000, source: 'Statement', notes: '' })
      await database.saveBalanceSnapshot({ accountId: 'SB1', date: '2026-01-01', reportedBalancePaise: 1_400_000, source: 'Statement', notes: '' })
      const calculated = Object.fromEntries(database.getBalanceSnapshots().map((item) => [item.date, item.calculatedBalancePaise]))
      expect(calculated).toEqual({ '2025-12-31': 1_000_000, '2026-01-01': 1_400_000 })
      const sent = applied.flatMap((call) => (call.changes.fixed_deposits?.upsert ?? []) as Array<Record<string, unknown>>).at(-1)!
      expect(Number(sent.principal_returned)).toBe(1)
      await database.close()
    })
  })

  it('sends the new app version so older cached copies are refused', async () => {
    const { database, applied } = await open()
    await database.saveFixedDeposit(deposit)
    expect(applied[0].changes.client_api_version).toBe(5)
    await database.close()
  })

  it('keeps a payout deposit through a save and records its interest as income that no longer shows as due', async () => {
    const { database } = await open()
    const id = await database.saveFixedDeposit({ ...deposit, interestType: 'payout', compoundsPerYear: 4, startDate: '2026-03-01', maturityDate: '2027-03-01', linkedAccountId: 'SB2' })
    const saved = database.getFixedDeposits().find((item) => item.id === id)!
    expect(saved).toMatchObject({ interestType: 'payout', compoundsPerYear: 4 })

    const { fdPayoutSummary, payoutDescription } = await import('../domain/fd-payouts')
    expect(fdPayoutSummary(saved, '2026-06-02', database.getAllTransactions()).due).toHaveLength(1)
    await database.saveTransaction({ type: 'income', date: '2026-06-02', accountId: 'SB2', fromAccountId: null, toAccountId: null, description: payoutDescription(saved), amountPaise: 7_000, categoryId: null, notes: '' })
    expect(balance(database, 'SB2')).toBe(7_000)
    expect(fdPayoutSummary(saved, '2026-06-02', database.getAllTransactions()).due).toEqual([])
    await database.close()
  })
})
