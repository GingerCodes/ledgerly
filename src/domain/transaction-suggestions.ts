import type { Account, Transaction, TransactionType } from './models'

const newestFirst = (a: Transaction, b: Transaction) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)

/** The categories used most often for this kind of transaction (ties go to the more recently used), limited to `allowed`. */
export function topCategoryIds(transactions: Transaction[], type: TransactionType, allowed: Set<string>, limit: number): string[] {
  const stats = new Map<string, { count: number; latest: string }>()
  for (const item of transactions) {
    if (item.type !== type || !item.categoryId || !allowed.has(item.categoryId)) continue
    const entry = stats.get(item.categoryId) ?? { count: 0, latest: '' }
    entry.count += 1
    if (item.date > entry.latest) entry.latest = item.date
    stats.set(item.categoryId, entry)
  }
  return [...stats.entries()]
    .sort(([, a], [, b]) => b.count - a.count || b.latest.localeCompare(a.latest))
    .slice(0, limit)
    .map(([id]) => id)
}

/** The account the most recent income/expense used, if it is still active; else Cash, else the first active account. */
export function defaultAccountId(transactions: Transaction[], accounts: Account[]): string {
  const active = new Set(accounts.filter((account) => account.status === 'active').map((account) => account.id))
  const latest = [...transactions].sort(newestFirst).find((item) => item.accountId && active.has(item.accountId))
  if (latest?.accountId) return latest.accountId
  if (active.has('CASH')) return 'CASH'
  return accounts.find((account) => account.status === 'active')?.id ?? ''
}

/** The category of the latest transaction with the same description (ignoring case), if any. */
export function categoryForDescription(transactions: Transaction[], description: string): string | null {
  const key = description.trim().toLowerCase()
  if (!key) return null
  return transactions
    .filter((item) => item.categoryId && item.description.trim().toLowerCase() === key)
    .sort(newestFirst)[0]?.categoryId ?? null
}
