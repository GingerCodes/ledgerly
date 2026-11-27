import { describe, expect, it } from 'vitest'
import { monthlyNetWorth } from './networth'
import type { Account, FixedDeposit, Transaction } from './models'

const account = (id: string, type: Account['type'], openingBalancePaise: number, openingDate = '2026-01-01'): Account => ({
  id, name: id, type, institution: '', accountNumber: '', status: 'active', openingDate, openingBalancePaise, currentBalancePaise: 0, createdAt: '', updatedAt: '',
})
const tx = (id: string, date: string, type: Transaction['type'], accountId: string | null, amountPaise: number): Transaction => ({
  id, date, type, accountId, fromAccountId: null, toAccountId: null, description: id, amountPaise, categoryId: null, notes: '', createdAt: '', updatedAt: '',
})
const deposit = (overrides: Partial<FixedDeposit>): FixedDeposit => ({
  id: 'fd', institution: 'SBI', accountNumber: 'FD', principalPaise: 40_000, startDate: '2026-04-10', maturityDate: '2027-04-10', annualRateBasisPoints: 700,
  interestType: 'simple', compoundsPerYear: 1, linkedAccountId: null, fundingAccountId: null, maturityInstruction: '', status: 'active', notes: '', createdAt: '', updatedAt: '', ...overrides,
})

const accounts = [account('CASH', 'cash', 0), account('SB1', 'savings', 100_000)]

describe('monthlyNetWorth', () => {
  it('follows balances month by month', () => {
    const points = monthlyNetWorth({
      accounts,
      transactions: [tx('salary', '2026-02-10', 'income', 'SB1', 50_000), tx('lunch', '2026-03-05', 'expense', 'CASH', 1_000)],
      deposits: [],
      endMonth: '2026-03',
      months: 3,
    })
    expect(points.map((point) => point.month)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(points.map((point) => point.totalPaise)).toEqual([100_000, 150_000, 149_000])
    expect(points[2]).toMatchObject({ cashPaise: -1_000, savingsPaise: 150_000 })
  })

  it('moving money into a funded deposit leaves net worth unchanged; an unfunded deposit adds to it', () => {
    const funded = monthlyNetWorth({ accounts, transactions: [], deposits: [deposit({ fundingAccountId: 'SB1' })], endMonth: '2026-05', months: 3 })
    expect(funded.map((point) => point.totalPaise)).toEqual([100_000, 100_000, 100_000])
    expect(funded[2]).toMatchObject({ savingsPaise: 60_000, fixedDepositsPaise: 40_000 })

    const legacy = monthlyNetWorth({ accounts, transactions: [], deposits: [deposit({})], endMonth: '2026-05', months: 3 })
    expect(legacy.map((point) => point.totalPaise)).toEqual([100_000, 140_000, 140_000])
  })

  it('counts accounts only from their opening date and stops counting a closed deposit after maturity', () => {
    const points = monthlyNetWorth({
      accounts: [...accounts, account('SB2', 'savings', 20_000, '2026-03-15')],
      transactions: [],
      deposits: [deposit({ startDate: '2026-01-05', maturityDate: '2026-02-20', status: 'closed' })],
      endMonth: '2026-03',
      months: 3,
    })
    expect(points.map((point) => point.fixedDepositsPaise)).toEqual([40_000, 0, 0])
    expect(points.map((point) => point.savingsPaise)).toEqual([100_000, 100_000, 120_000])
  })
})
