export type AccountType = 'cash' | 'savings'
export type TransactionType = 'expense' | 'income' | 'transfer'
export type FixedDepositInterestType = 'simple' | 'compound'

export interface Account {
  id: string
  name: string
  type: AccountType
  institution: string
  accountNumber: string
  status: 'active' | 'inactive'
  openingDate: string
  openingBalancePaise: number
  currentBalancePaise: number
  createdAt: string
  updatedAt: string
}

/** Bank + last four digits for savings accounts (their names are usually identical); the plain name otherwise. */
export function accountLabel(account: Pick<Account, 'name' | 'institution' | 'accountNumber'>): string {
  const last4 = account.accountNumber.trim().slice(-4)
  return account.institution && last4 ? `${account.institution} •••• ${last4}` : account.name
}

export interface Category {
  id: string
  name: string
  parentCategoryId: string | null
  active: boolean
}

export interface Transaction {
  id: string
  date: string
  type: TransactionType
  accountId: string | null
  fromAccountId: string | null
  toAccountId: string | null
  description: string
  amountPaise: number
  categoryId: string | null
  notes: string
  createdAt: string
  updatedAt: string
}

export interface TransactionInput {
  id?: string
  date: string
  type: TransactionType
  accountId: string | null
  fromAccountId: string | null
  toAccountId: string | null
  description: string
  amountPaise: number
  categoryId: string | null
  notes: string
}

export interface FixedDeposit {
  id: string
  institution: string
  accountNumber: string
  principalPaise: number
  startDate: string
  maturityDate: string
  annualRateBasisPoints: number
  interestType: FixedDepositInterestType
  compoundsPerYear: number
  linkedAccountId: string | null
  maturityInstruction: string
  status: 'active' | 'matured' | 'closed'
  notes: string
  createdAt: string
  updatedAt: string
}

export interface FixedDepositInput {
  id?: string
  institution: string
  accountNumber: string
  principalPaise: number
  startDate: string
  maturityDate: string
  annualRateBasisPoints: number
  interestType: FixedDepositInterestType
  compoundsPerYear: number
  linkedAccountId: string | null
  maturityInstruction: string
  notes: string
}

export interface BalanceSnapshot {
  id: string
  accountId: string
  date: string
  reportedBalancePaise: number
  calculatedBalancePaise: number
  source: string
  notes: string
  createdAt: string
}

export interface BalanceSnapshotInput {
  accountId: string
  date: string
  reportedBalancePaise: number
  source: string
  notes: string
}

export interface YearSummary {
  incomePaise: number
  expensePaise: number
  transferPaise: number
  transactionCount: number
  expensesByCategory: Array<{ categoryId: string | null; amountPaise: number }>
}

export interface ImportedTransaction {
  transaction: Omit<TransactionInput, 'id'> & { id: string }
  rowNumber: number
}

export function parseRupeesToPaise(value: string): number {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Enter an amount using digits and up to two decimal places.')
  }

  const amountPaise = Math.round(Number(normalized) * 100)
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new Error('Amount must be greater than zero and within the supported range.')
  }
  return amountPaise
}

export function parseNonNegativeRupeesToPaise(value: string): number {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Enter an amount using digits and up to two decimal places.')
  }

  const amountPaise = Math.round(Number(normalized) * 100)
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 0) {
    throw new Error('Amount cannot be negative or exceed the supported range.')
  }
  return amountPaise
}

export function formatRupees(amountPaise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amountPaise / 100)
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

export function categoryPath(
  categoryId: string | null,
  categories: Category[],
): string {
  if (categoryId === null) return 'Uncategorized'
  const byId = new Map(categories.map((category) => [category.id, category]))
  const names: string[] = []
  const seen = new Set<string>()
  let current = byId.get(categoryId)

  while (current) {
    if (seen.has(current.id)) throw new Error('Category hierarchy contains a cycle.')
    seen.add(current.id)
    names.unshift(current.name)
    current = current.parentCategoryId
      ? byId.get(current.parentCategoryId)
      : undefined
  }

  return names.length > 0 ? names.join(' > ') : 'Uncategorized'
}

export function categoryDescendantIds(categoryId: string, categories: Category[]): string[] {
  const childrenByParent = new Map<string, string[]>()
  for (const category of categories) {
    if (!category.parentCategoryId) continue
    const siblings = childrenByParent.get(category.parentCategoryId) ?? []
    siblings.push(category.id)
    childrenByParent.set(category.parentCategoryId, siblings)
  }

  const result: string[] = []
  const visited = new Set<string>()
  const visit = (id: string) => {
    if (visited.has(id)) throw new Error('Category hierarchy contains a cycle.')
    visited.add(id)
    result.push(id)
    for (const childId of childrenByParent.get(id) ?? []) visit(childId)
  }

  visit(categoryId)
  return result
}

export function calculateAccountBalances(accounts: Account[], transactions: Transaction[]): Map<string, number> {
  const balances = new Map(
    accounts.map((account) => [account.id, account.openingBalancePaise]),
  )

  for (const transaction of transactions) {
    if (transaction.type === 'transfer') {
      if (transaction.fromAccountId) {
        balances.set(
          transaction.fromAccountId,
          (balances.get(transaction.fromAccountId) ?? 0) - transaction.amountPaise,
        )
      }
      if (transaction.toAccountId) {
        balances.set(
          transaction.toAccountId,
          (balances.get(transaction.toAccountId) ?? 0) + transaction.amountPaise,
        )
      }
      continue
    }

    if (!transaction.accountId) continue
    const change = transaction.type === 'income'
      ? transaction.amountPaise
      : -transaction.amountPaise
    balances.set(
      transaction.accountId,
      (balances.get(transaction.accountId) ?? 0) + change,
    )
  }

  return balances
}

export function estimateFixedDepositMaturityValue(fd: FixedDeposit): number {
  const start = new Date(`${fd.startDate}T00:00:00.000Z`)
  const maturity = new Date(`${fd.maturityDate}T00:00:00.000Z`)
  const days = (maturity.valueOf() - start.valueOf()) / 86_400_000
  if (days <= 0) return fd.principalPaise

  const years = days / 365
  const annualRate = fd.annualRateBasisPoints / 10_000
  const value = fd.interestType === 'simple'
    ? fd.principalPaise * (1 + annualRate * years)
    : fd.principalPaise * (1 + annualRate / fd.compoundsPerYear) ** (fd.compoundsPerYear * years)

  const estimate = Math.round(value)
  if (!Number.isSafeInteger(estimate)) {
    throw new Error('This fixed-deposit estimate exceeds the supported amount range.')
  }
  return estimate
}
