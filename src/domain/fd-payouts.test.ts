import { describe, expect, it } from 'vitest'
import { estimateFixedDepositMaturityValue, type FixedDeposit, type Transaction } from './models'
import { fdPayoutSchedule, fdPayoutSummary, payoutDescription, payoutsToRecord } from './fd-payouts'

const deposit = (overrides: Partial<FixedDeposit> = {}): FixedDeposit => ({
  id: 'fd', institution: 'SBI', accountNumber: 'FD1', principalPaise: 10_000_000, startDate: '2026-01-15', maturityDate: '2027-01-15',
  annualRateBasisPoints: 700, interestType: 'payout', compoundsPerYear: 4, linkedAccountId: 'SB1', fundingAccountId: 'SB1',
  maturityInstruction: '', status: 'active', closedDate: null, principalReturned: false, notes: '', createdAt: '', updatedAt: '', ...overrides,
})
const credit = (date: string, fd = deposit()): Transaction => ({
  id: date, date, type: 'income', accountId: 'SB1', fromAccountId: null, toAccountId: null, description: payoutDescription(fd),
  amountPaise: 175_000, categoryId: null, notes: '', createdAt: '', updatedAt: '',
})

describe('payout deposits', () => {
  it('returns only the principal at maturity, because the interest is paid out along the way', () => {
    expect(estimateFixedDepositMaturityValue(deposit())).toBe(10_000_000)
  })

  it('pays quarterly: 4 payouts of rate ÷ 4, the last on the maturity date', () => {
    const schedule = fdPayoutSchedule(deposit(), [])
    expect(schedule.map((item) => item.dueDate)).toEqual(['2026-04-15', '2026-07-15', '2026-10-15', '2027-01-15'])
    expect(schedule.every((item) => item.amountPaise === 175_000)).toBe(true)
  })

  it('pays a smaller last payout when the term does not divide evenly, and clamps month ends', () => {
    const schedule = fdPayoutSchedule(deposit({ startDate: '2026-01-31', maturityDate: '2026-08-31' }), [])
    expect(schedule.map((item) => item.dueDate)).toEqual(['2026-04-30', '2026-07-31', '2026-08-31'])
    expect(schedule[2].amountPaise).toBeLessThan(175_000)
    expect(schedule[2].amountPaise).toBeGreaterThan(0)
  })

  it('supports monthly and yearly payouts', () => {
    expect(fdPayoutSchedule(deposit({ compoundsPerYear: 12 }), [])).toHaveLength(12)
    const yearly = fdPayoutSchedule(deposit({ compoundsPerYear: 1 }), [])
    expect(yearly).toEqual([{ dueDate: '2027-01-15', amountPaise: 700_000, received: false }])
  })

  it('marks a payout received when the credit lands in its window, even a couple of days late', () => {
    const summary = fdPayoutSummary(deposit(), '2026-08-01', [credit('2026-04-17'), credit('2026-07-14')])
    expect(summary.receivedPaise).toBe(350_000)
    expect(summary.due).toEqual([])
    expect(summary.next?.dueDate).toBe('2026-10-15')
  })

  it('shows payouts that are due but not recorded, and ignores a credit dated long before the first one is due', () => {
    const summary = fdPayoutSummary(deposit(), '2026-08-01', [credit('2026-03-01')])
    expect(summary.due.map((item) => item.dueDate)).toEqual(['2026-04-15', '2026-07-15'])
    expect(payoutsToRecord([deposit()], '2026-08-01', [credit('2026-03-01')])).toBe(2)
    expect(payoutsToRecord([deposit({ status: 'closed' }), deposit({ interestType: 'compound' })], '2026-08-01', [])).toBe(0)
  })

  it('leaves simple and compound deposits alone', () => {
    expect(fdPayoutSchedule(deposit({ interestType: 'simple' }), [])).toEqual([])
    expect(estimateFixedDepositMaturityValue(deposit({ interestType: 'simple' }))).toBeGreaterThan(10_000_000)
  })
})
