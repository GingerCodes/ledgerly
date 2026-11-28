import type { FixedDeposit, Transaction } from './models'

export interface FdPayout {
  dueDate: string
  amountPaise: number
  received: boolean
}

/** Description used for recorded interest, so received payouts can be found again without a link column. */
export function payoutDescription(deposit: Pick<FixedDeposit, 'institution' | 'accountNumber'>): string {
  return `FD interest – ${deposit.institution} ${deposit.accountNumber}`
}

function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const index = year * 12 + (month - 1) + months
  const targetYear = Math.floor(index / 12)
  const targetMonth = index % 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)

/** Matching is by date window: a credit up to 10 days before the due date, until 10 days before the next one. */
const GRACE_DAYS = 10

/**
 * Interest payments of a payout deposit: one every 12 ÷ n months from the start date, a smaller last one on the
 * maturity date when the term does not divide evenly. Each is marked received when an income transaction with the
 * deposit's payout description falls in its window.
 */
export function fdPayoutSchedule(deposit: FixedDeposit, transactions: Transaction[]): FdPayout[] {
  if (deposit.interestType !== 'payout') return []
  const stepMonths = 12 / deposit.compoundsPerYear
  const fullPaise = Math.round((deposit.principalPaise * deposit.annualRateBasisPoints) / 10_000 / deposit.compoundsPerYear)
  const dates: Array<{ dueDate: string; amountPaise: number }> = []
  let previous = deposit.startDate
  for (let step = 1; ; step++) {
    const dueDate = addMonths(deposit.startDate, step * stepMonths)
    if (dueDate >= deposit.maturityDate) break
    dates.push({ dueDate, amountPaise: fullPaise })
    previous = dueDate
  }
  if (deposit.maturityDate > deposit.startDate) {
    const fullPeriodDays = daysBetween(previous, addMonths(previous, stepMonths))
    const lastDays = daysBetween(previous, deposit.maturityDate)
    dates.push({ dueDate: deposit.maturityDate, amountPaise: lastDays >= fullPeriodDays ? fullPaise : Math.round((fullPaise * lastDays) / fullPeriodDays) })
  }

  const credits = transactions.filter((transaction) => transaction.type === 'income' && transaction.description === payoutDescription(deposit))
  return dates.map((item, index) => {
    const from = addDays(item.dueDate, -GRACE_DAYS)
    const until = index + 1 < dates.length ? addDays(dates[index + 1].dueDate, -GRACE_DAYS) : addDays(item.dueDate, 60)
    return { ...item, received: credits.some((credit) => credit.date >= from && credit.date < until) }
  })
}

export interface FdPayoutSummary {
  perPayoutPaise: number
  totalInterestPaise: number
  receivedPaise: number
  /** Not yet received and due today or earlier. */
  due: FdPayout[]
  /** The first payout not yet received. */
  next: FdPayout | null
}

export function fdPayoutSummary(deposit: FixedDeposit, today: string, transactions: Transaction[]): FdPayoutSummary {
  const schedule = fdPayoutSchedule(deposit, transactions)
  const description = payoutDescription(deposit)
  return {
    perPayoutPaise: Math.round((deposit.principalPaise * deposit.annualRateBasisPoints) / 10_000 / deposit.compoundsPerYear),
    totalInterestPaise: schedule.reduce((sum, item) => sum + item.amountPaise, 0),
    receivedPaise: transactions.filter((t) => t.type === 'income' && t.description === description).reduce((sum, t) => sum + t.amountPaise, 0),
    due: schedule.filter((item) => !item.received && item.dueDate <= today),
    next: schedule.find((item) => !item.received) ?? null,
  }
}

/** Payouts waiting to be recorded across all open payout deposits, for the Overview. */
export function payoutsToRecord(deposits: FixedDeposit[], today: string, transactions: Transaction[]): number {
  return deposits
    .filter((deposit) => deposit.status !== 'closed' && deposit.interestType === 'payout')
    .reduce((count, deposit) => count + fdPayoutSummary(deposit, today, transactions).due.length, 0)
}
