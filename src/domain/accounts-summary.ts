import type { Account, FixedDeposit } from './models'

/** Totals for the top of the Accounts page. Cash is left out on purpose; closed deposits are not holdings any more. */
export function accountsSummary(accounts: Account[], deposits: FixedDeposit[]) {
  const savings = accounts.filter((account) => account.type === 'savings')
  const openDeposits = deposits.filter((deposit) => deposit.status !== 'closed')
  const savingsPaise = savings.reduce((sum, account) => sum + account.currentBalancePaise, 0)
  const depositsPaise = openDeposits.reduce((sum, deposit) => sum + deposit.principalPaise, 0)
  return { savingsCount: savings.length, savingsPaise, depositCount: openDeposits.length, depositsPaise, totalPaise: savingsPaise + depositsPaise }
}
