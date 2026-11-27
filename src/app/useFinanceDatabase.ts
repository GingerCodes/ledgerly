import { useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { FinanceDatabase } from '../data/finance-database'

/** Opens the signed-in user's finance database and closes it again on sign-out. */
export function useFinanceDatabase(supabase: SupabaseClient | null, userId: string | undefined) {
  const [database, setDatabase] = useState<FinanceDatabase | null>(null)
  const databaseRef = useRef<FinanceDatabase | null>(null)
  const [loadingError, setLoadingError] = useState('')

  useEffect(() => {
    if (!supabase || !userId) return

    let active = true
    FinanceDatabase.open(supabase, userId).then((opened) => {
      if (active) {
        databaseRef.current = opened
        setDatabase(opened)
        setLoadingError('')
      }
    }).catch((error: unknown) => {
      if (active) setLoadingError(error instanceof Error ? error.message : 'Could not open your finance data.')
    })
    return () => { active = false }
  }, [supabase, userId])

  useEffect(() => {
    if (userId || !databaseRef.current) return
    void databaseRef.current.close()
    databaseRef.current = null
    setDatabase(null)
  }, [userId])

  return { database, loadingError }
}
