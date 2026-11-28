import { calculateAccountBalances, closedDateOf, type Account, type FixedDeposit, type Transaction } from './models'

export interface NetWorthPoint {
  /** `YYYY-MM` */
  month: string
  cashPaise: number
  savingsPaise: number
  fixedDepositsPaise: number
  totalPaise: number
}

function addMonths(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const index = year * 12 + (monthNumber - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/**
 * Net worth at the end of each of the last `months` months (oldest first), from recorded data only:
 * account balances (opening balance plus transactions up to month end, less deposits funded from the account)
 * and fixed-deposit principal. Accounts count from their opening date.
 *
 * A closed deposit stops counting on its closing date and its principal returns to the account it was paid into
 * (the maturity account, else the funding account), exactly like the balance rule in the database. Interest accrued
 * before closing is not included.
 */
export function monthlyNetWorth(input: {
  accounts: Account[]
  transactions: Transaction[]
  deposits: FixedDeposit[]
  endMonth: string
  months: number
}): NetWorthPoint[] {
  const { accounts, transactions, deposits, endMonth, months } = input
  // An account counts from its opening date, or from its first transaction if that is earlier: the opening date
  // defaults to the day the account was added, so income entered for last month would otherwise vanish from last month.
  const firstUse = new Map<string, string>()
  for (const { date, accountId, fromAccountId, toAccountId } of transactions) {
    for (const id of [accountId, fromAccountId, toAccountId]) {
      if (id && (firstUse.get(id) ?? '9999') > date) firstUse.set(id, date)
    }
  }
  const startOf = (account: Account) => [account.openingDate, firstUse.get(account.id) ?? account.openingDate].sort()[0]
  return Array.from({ length: months }, (_, index) => {
    const month = addMonths(endMonth, index - (months - 1))
    const monthEnd = `${month}-31` // every date in the month sorts at or before this
    const balances = calculateAccountBalances(accounts, transactions.filter((transaction) => transaction.date <= monthEnd))
    for (const deposit of deposits) {
      if (deposit.fundingAccountId && deposit.startDate <= monthEnd) {
        balances.set(deposit.fundingAccountId, (balances.get(deposit.fundingAccountId) ?? 0) - deposit.principalPaise)
      }
      // The principal comes back when the deposit was funded from an account, or when the user said to add it on closing.
      if (deposit.status === 'closed' && closedDateOf(deposit) <= monthEnd && (deposit.fundingAccountId || deposit.principalReturned)) {
        const receiving = deposit.linkedAccountId ?? deposit.fundingAccountId
        if (receiving) balances.set(receiving, (balances.get(receiving) ?? 0) + deposit.principalPaise)
      }
    }

    let cashPaise = 0
    let savingsPaise = 0
    for (const account of accounts) {
      if (startOf(account) > monthEnd) continue
      const balance = balances.get(account.id) ?? 0
      if (account.type === 'cash') cashPaise += balance
      else savingsPaise += balance
    }
    const fixedDepositsPaise = deposits
      .filter((deposit) => deposit.startDate <= monthEnd && (deposit.status !== 'closed' || closedDateOf(deposit) > monthEnd))
      .reduce((total, deposit) => total + deposit.principalPaise, 0)

    return { month, cashPaise, savingsPaise, fixedDepositsPaise, totalPaise: cashPaise + savingsPaise + fixedDepositsPaise }
  })
}
