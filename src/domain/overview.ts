import { estimateFixedDepositMaturityValue, type FixedDeposit } from './models'

/** Change from `previous` to `current` in percent, or null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  return previous === 0 ? null : Math.round(((current - previous) / previous) * 100)
}

/** Share of income that was not spent, in percent; null when there was no income. */
export function savingsRate(incomePaise: number, expensePaise: number): number | null {
  return incomePaise === 0 ? null : Math.round(((incomePaise - expensePaise) / incomePaise) * 100)
}

/** Daily average so far and, for the current month only, where the month is heading at this pace. */
export function spendingPace(expensePaise: number, month: string, today: string): { dailyAveragePaise: number; projectedPaise: number | null } {
  const [year, number] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, number, 0)).getUTCDate()
  const isCurrent = today.slice(0, 7) === month
  const elapsed = isCurrent ? Number(today.slice(8, 10)) : daysInMonth
  const dailyAveragePaise = Math.round(expensePaise / elapsed)
  return { dailyAveragePaise, projectedPaise: isCurrent ? dailyAveragePaise * daysInMonth : null }
}

export interface CategoryMover {
  categoryId: string | null
  amountPaise: number
  previousPaise: number
  /** Null for a category with no spending last month. */
  changePercent: number | null
}

type CategoryTotals = Array<{ categoryId: string | null; amountPaise: number }>

/** This month's spending per category (largest first), each with its change from last month. */
export function categoryMovers(current: CategoryTotals, previous: CategoryTotals): CategoryMover[] {
  const sum = (rows: CategoryTotals) => {
    const totals = new Map<string | null, number>()
    for (const row of rows) totals.set(row.categoryId, (totals.get(row.categoryId) ?? 0) + row.amountPaise)
    return totals
  }
  const before = sum(previous)
  return [...sum(current)]
    .map(([categoryId, amountPaise]) => {
      const previousPaise = before.get(categoryId) ?? 0
      return { categoryId, amountPaise, previousPaise, changePercent: percentChange(amountPaise, previousPaise) }
    })
    .sort((left, right) => right.amountPaise - left.amountPaise)
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

/** Open deposits maturing from today up to `days` days ahead, soonest first, with an estimated maturity value. */
export function upcomingMaturities(deposits: FixedDeposit[], today: string, days = 90): Array<{ deposit: FixedDeposit; estimatePaise: number }> {
  const last = addDays(today, days)
  return deposits
    .filter((deposit) => deposit.status !== 'closed' && deposit.maturityDate >= today && deposit.maturityDate <= last)
    .sort((left, right) => left.maturityDate.localeCompare(right.maturityDate))
    .map((deposit) => ({ deposit, estimatePaise: estimateFixedDepositMaturityValue(deposit) }))
}

/** Open deposits whose maturity date has passed: the user probably needs to close them. */
export function overdueDeposits(deposits: FixedDeposit[], today: string): FixedDeposit[] {
  return deposits.filter((deposit) => deposit.status !== 'closed' && deposit.maturityDate < today)
}
