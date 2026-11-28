import { describe, expect, it } from 'vitest'
import type { FixedDeposit } from './models'
import { categoryMovers, overdueDeposits, percentChange, savingsRate, spendingPace, upcomingMaturities } from './overview'

const deposit = (id: string, maturityDate: string, status: FixedDeposit['status'] = 'active'): FixedDeposit => ({
  id, institution: 'Bank', accountNumber: id, principalPaise: 100000, startDate: '2025-01-01', maturityDate,
  annualRateBasisPoints: 1000, interestType: 'simple', compoundsPerYear: 1, linkedAccountId: null, fundingAccountId: null,
  maturityInstruction: '', status, closedDate: null, notes: '', createdAt: '', updatedAt: '',
})

describe('overview maths', () => {
  it('compares with last month only when there was something last month', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
    expect(percentChange(10, 0)).toBeNull()
  })

  it('gives a savings rate, negative when overspent, and none without income', () => {
    expect(savingsRate(100000, 75000)).toBe(25)
    expect(savingsRate(100000, 120000)).toBe(-20)
    expect(savingsRate(0, 500)).toBeNull()
  })

  it('projects the month end only for the current month', () => {
    expect(spendingPace(30000, '2026-11', '2026-11-10')).toEqual({ dailyAveragePaise: 3000, projectedPaise: 90000 })
    expect(spendingPace(60000, '2026-10', '2026-11-10')).toEqual({ dailyAveragePaise: Math.round(60000 / 31), projectedPaise: null })
  })

  it('merges category totals and flags new and changed categories', () => {
    const movers = categoryMovers(
      [{ categoryId: 'food', amountPaise: 300 }, { categoryId: 'food', amountPaise: 100 }, { categoryId: 'fuel', amountPaise: 500 }],
      [{ categoryId: 'food', amountPaise: 200 }, { categoryId: 'rent', amountPaise: 900 }],
    )
    expect(movers).toEqual([
      { categoryId: 'fuel', amountPaise: 500, previousPaise: 0, changePercent: null },
      { categoryId: 'food', amountPaise: 400, previousPaise: 200, changePercent: 100 },
    ])
  })

  it('lists deposits maturing within 90 days, inclusive, and ones already past maturity', () => {
    const deposits = [
      deposit('day90', '2026-02-26'), deposit('day91', '2026-02-27'), deposit('today', '2025-11-28'),
      deposit('past', '2025-11-27'), deposit('closed', '2025-12-15', 'closed'),
    ]
    expect(upcomingMaturities(deposits, '2025-11-28').map((item) => item.deposit.id)).toEqual(['today', 'day90'])
    expect(overdueDeposits(deposits, '2025-11-28').map((item) => item.id)).toEqual(['past'])
  })
})
