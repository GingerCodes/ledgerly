import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { FinanceDatabase } from '../data/finance-database'
import { FinanceContext, type FinanceContextValue, type NoticeState } from './finance-context'

const NO_NOTICE: NoticeState = { error: '', success: '' }

export function FinanceProvider({ database, children }: { database: FinanceDatabase; children: ReactNode }) {
  const [revision, setRevision] = useState(0)
  const [notice, setNotice] = useState<NoticeState>(NO_NOTICE)

  const refresh = useCallback(() => setRevision((key) => key + 1), [])
  const clearNotice = useCallback(() => setNotice(NO_NOTICE), [])
  const showSuccess = useCallback((message: string) => setNotice({ error: '', success: message }), [])
  const showError = useCallback((error: unknown) => {
    setNotice({ error: error instanceof Error ? error.message : 'The requested action failed.', success: '' })
  }, [])
  const runAction = useCallback(async (action: () => Promise<unknown>, success: string) => {
    setNotice(NO_NOTICE)
    try {
      await action()
      refresh()
      setNotice({ error: '', success })
    } catch (error) {
      showError(error)
      throw error
    }
  }, [refresh, showError])

  const data = useMemo(() => ({
    revision,
    accounts: database.getAccounts(),
    categories: database.getCategories(),
    deposits: database.getFixedDeposits(),
    snapshots: database.getBalanceSnapshots(),
  }), [database, revision])

  const value = useMemo<FinanceContextValue>(
    () => ({ database, ...data, notice, refresh, runAction, showSuccess, showError, clearNotice }),
    [database, data, notice, refresh, runAction, showSuccess, showError, clearNotice],
  )
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}
