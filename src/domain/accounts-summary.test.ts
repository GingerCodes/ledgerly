import { describe, expect, it } from 'vitest'
import { accountsSummary } from './accounts-summary'
import type { Account, FixedDeposit } from './models'

const account = (id: string, type: Account['type'], currentBalancePaise: number): Account => ({
  id, name: id, type, institution: '', accountNumber: '', status: 'active', openingDate: '2026-01-01', openingBalancePaise: 0, currentBalancePaise, createdAt: '', updatedAt: '',
})
const deposit = (status: FixedDeposit['status'], principalPaise: number): FixedDeposit => ({
  id: status + principalPaise, institution: 'SBI', accountNumber: 'FD', principalPaise, startDate: '2026-01-01', maturityDate: '2026-02-01', annualRateBasisPoints: 700,
  interestType: 'simple', compoundsPerYear: 1, linkedAccountId: null, fundingAccountId: null, maturityInstruction: '', status, closedDate: null, principalReturned: false, notes: '', createdAt: '', updatedAt: '',
})

describe('accountsSummary', () => {
  it('totals savings and open deposits, leaving out cash and closed deposits', () => {
    expect(accountsSummary(
      [account('CASH', 'cash', 5_000), account('SB1', 'savings', 100_000), account('SB2', 'savings', 50_000)],
      [deposit('active', 200_000), deposit('matured', 30_000), deposit('closed', 999_999)],
    )).toEqual({ savingsCount: 2, savingsPaise: 150_000, depositCount: 2, depositsPaise: 230_000, totalPaise: 380_000 })
  })

  it('is all zero with nothing added', () => {
    expect(accountsSummary([], [])).toEqual({ savingsCount: 0, savingsPaise: 0, depositCount: 0, depositsPaise: 0, totalPaise: 0 })
  })
})
