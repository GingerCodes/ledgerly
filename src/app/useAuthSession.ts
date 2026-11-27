import { useEffect, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

export function useAuthSession(supabase: SupabaseClient | null) {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [authStateError, setAuthStateError] = useState('')

  useEffect(() => {
    if (!supabase) return

    let active = true
    supabase.auth.initialize().then(async ({ error: initializationError }) => {
      const { data, error } = await supabase.auth.getSession()
      if (!active) return
      if (initializationError || error) {
        setAuthStateError((initializationError || error)?.message ?? 'Authentication failed.')
      } else {
        setSession(data.session)
      }
      setAuthReady(true)
    }).catch((error: unknown) => {
      if (!active) return
      setAuthStateError(error instanceof Error ? error.message : 'Authentication failed.')
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setAuthStateError('')
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  /** Resolves to the sign-out error, if any. `local` only clears this browser's session (the server session is already gone after account deletion). */
  async function signOut(options?: { local?: boolean }): Promise<Error | null> {
    if (!supabase) return null
    const { error } = await supabase.auth.signOut(options?.local ? { scope: 'local' } : undefined)
    return error
  }

  return { session, authReady, authStateError, clearAuthError: () => setAuthStateError(''), signOut }
}
