import type { User } from '@supabase/supabase-js'

/**
 * The user's full name. Google sign-in (OpenID profile) fills `full_name` / `name` automatically and
 * email sign-ups store `full_name` at registration; older accounts fall back to the email address.
 */
export function displayName(user: Pick<User, 'email' | 'user_metadata'>): string {
  for (const key of ['full_name', 'name']) {
    const value: unknown = user.user_metadata?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return user.email ?? ''
}
