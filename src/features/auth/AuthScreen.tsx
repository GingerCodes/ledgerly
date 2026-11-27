import { useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Wallet } from 'lucide-react'

export function AuthScreen({
  client,
  configurationError,
  externalError,
  clearExternalError,
}: {
  client: SupabaseClient | null
  configurationError: string
  externalError: string
  clearExternalError: () => void
}) {
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client) return
    setBusy(true)
    clearExternalError()
    setError('')
    setSuccess('')
    try {
      if (creatingAccount) {
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim(),
          password,
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setSuccess('Account created. Check your email to confirm the address, then sign in.')
        }
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) throw signInError
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  async function signInWithGoogle() {
    if (!client) return
    setBusy(true)
    clearExternalError()
    setError('')
    setSuccess('')
    try {
      const { error: signInError } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      })
      if (signInError) throw signInError
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Google sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="loading-mark"><Wallet size={28} /></div>
        <p className="eyebrow">PRIVATE FINANCE TRACKER</p>
        <h1>{client ? 'Sign in to Ledgerly' : 'Set up Ledgerly'}</h1>
        <p className="auth-description">
          {client
            ? 'Your finance records are stored in your private account.'
            : 'Set SB_URL and SB_ANON_KEY in a local environment file.'}
        </p>
        {(configurationError || externalError || error) && (
          <p className="form-error" role="alert">{configurationError || externalError || error}</p>
        )}
        {success && <p className="auth-success" role="status">{success}</p>}
        {!client ? (
          <ol className="auth-setup">
            <li>Copy <code>.env.example</code> to <code>.env.local</code>.</li>
            <li>Enter the project URL and publishable/anon key from your project's API settings.</li>
            <li>Apply the SQL migration documented in README, then restart the app.</li>
          </ol>
        ) : (
          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete={creatingAccount ? 'new-password' : 'current-password'} minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : creatingAccount ? 'Create account' : 'Sign in'}
            </button>
            <button className="button button-secondary" type="button" disabled={busy} onClick={() => void signInWithGoogle()}>
              Continue with Google
            </button>
            <button className="auth-switch" type="button" disabled={busy} onClick={() => { setCreatingAccount(!creatingAccount); clearExternalError(); setError(''); setSuccess('') }}>
              {creatingAccount ? 'Already have an account? Sign in' : 'New to Ledgerly? Create an account'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
