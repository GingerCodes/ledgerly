import { createClient } from '@supabase/supabase-js'

function isServiceRoleKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  const payload = key.split('.')[1]
  if (!payload) return false

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims: unknown = JSON.parse(atob(normalized))
    return typeof claims === 'object'
      && claims !== null
      && 'role' in claims
      && claims.role === 'service_role'
  } catch {
    return false
  }
}

export function createSupabaseClient() {
  const url = import.meta.env.SB_URL?.trim()
  const key = import.meta.env.SB_ANON_KEY?.trim()

  if (!url || !key) {
    return {
      client: null,
      error: 'The app is not configured. Copy .env.example to .env.local and set SB_URL and SB_ANON_KEY.',
    }
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return { client: null, error: 'The configured project URL (SB_URL) is invalid.' }
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
    return { client: null, error: 'The configured project URL (SB_URL) must use HTTPS.' }
  }
  if (isServiceRoleKey(key)) {
    return {
      client: null,
      error: 'A service-role or secret key cannot be used in this browser app. Use the publishable/anon key instead.',
    }
  }

  return {
    client: createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    }),
    error: '',
  }
}

export const supabaseSetup = createSupabaseClient()
