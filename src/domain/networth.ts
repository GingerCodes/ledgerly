import { calculateAccountBalances, type Account, type FixedDeposit, type Transaction } from './models'

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
 * shortcut: a closed deposit is assumed to have paid out on its maturity date (no closing date is stored),
 * and interest is not accrued; upgrade if a closed-on date or accrued-interest view is added.
 */
export function monthlyNetWorth(input: {
  accounts: Account[]
  transactions: Transaction[]
  deposits: FixedDeposit[]
  endMonth: string
  months: number
}): NetWorthPoint[] {
  const { accounts, transactions, deposits, endMonth, months } = input
  return Array.from({ length: months }, (_, index) => {
    const month = addMonths(endMonth, index - (months - 1))
    const monthEnd = `${month}-31` // every date in the month sorts at or before this
    const balances = calculateAccountBalances(accounts, transactions.filter((transaction) => transaction.date <= monthEnd))
    for (const deposit of deposits) {
      if (deposit.fundingAccountId && deposit.startDate <= monthEnd) {
        balances.set(deposit.fundingAccountId, (balances.get(deposit.fundingAccountId) ?? 0) - deposit.principalPaise)
      }
    }

    let cashPaise = 0
    let savingsPaise = 0
    for (const account of accounts) {
      if (account.openingDate > monthEnd) continue
      const balance = balances.get(account.id) ?? 0
      if (account.type === 'cash') cashPaise += balance
      else savingsPaise += balance
    }
    const fixedDepositsPaise = deposits
      .filter((deposit) => deposit.startDate <= monthEnd && (deposit.status !== 'closed' || deposit.maturityDate > monthEnd))
      .reduce((total, deposit) => total + deposit.principalPaise, 0)

    return { month, cashPaise, savingsPaise, fixedDepositsPaise, totalPaise: cashPaise + savingsPaise + fixedDepositsPaise }
  })
}
