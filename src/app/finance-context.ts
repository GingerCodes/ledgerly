import { createContext, useContext, useMemo } from 'react'
import type { FinanceDatabase } from '../data/finance-database'
import type { Account, BalanceSnapshot, Category, FixedDeposit } from '../domain/models'

export interface NoticeState {
  error: string
  success: string
}

export interface FinanceContextValue {
  database: FinanceDatabase
  /** Bumps after every successful change so memoized queries re-run. */
  revision: number
  accounts: Account[]
  categories: Category[]
  deposits: FixedDeposit[]
  snapshots: BalanceSnapshot[]
  notice: NoticeState
  refresh: () => void
  /** Runs a change, refreshes data and shows the result; rethrows so forms can stay open on failure. */
  runAction: (action: () => Promise<unknown>, success: string) => Promise<void>
  showSuccess: (message: string) => void
  showError: (error: unknown) => void
  clearNotice: () => void
}

export const FinanceContext = createContext<FinanceContextValue | null>(null)

export function useFinance(): FinanceContextValue {
  const value = useContext(FinanceContext)
  if (!value) throw new Error('useFinance must be used inside <FinanceProvider>.')
  return value
}

/** Memoized database query that re-runs when the data changes or `inputs` change. */
export function useFinanceQuery<T>(query: (database: FinanceDatabase) => T, inputs: readonly unknown[]): T {
  const { database, revision } = useFinance()
  // `query` is recreated every render, so memoize on the values it reads instead.
  const inputsKey = JSON.stringify(inputs)
  return useMemo(() => query(database), [database, revision, inputsKey]) // eslint-disable-line react-hooks/exhaustive-deps
}
