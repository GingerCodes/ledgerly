import { useEffect, useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Link, useLocation } from 'react-router'
import { rememberAfterLogin } from '../../lib/afterLogin'
import { Logo } from '../../components/Logo'
import { trackPageView } from '../../lib/analytics'
import { MAX_NAME_LENGTH } from '../../lib/user'

const LAST_METHOD_KEY = 'ledgerly-last-signin'
const lastSignInMethod = (): string | null => {
  try { return localStorage.getItem(LAST_METHOD_KEY) } catch { return null }
}
const rememberSignInMethod = (method: 'google' | 'email') => {
  try { localStorage.setItem(LAST_METHOD_KEY, method) } catch { /* storage blocked: Google stays the default */ }
}

/** The Google "G" in its brand colours. */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}

export function AuthScreen({
  mode,
  showHomeLink,
  client,
  configurationError,
  externalError,
  clearExternalError,
}: {
  mode: 'sign-in' | 'sign-up'
  /** A way back to the marketing page; left out in the installed app, which has no home page. */
  showHomeLink: boolean
  client: SupabaseClient | null
  configurationError: string
  externalError: string
  clearExternalError: () => void
}) {
  const creatingAccount = mode === 'sign-up'
  // Google comes first; the email form stays tucked away unless this device last signed in with email.
  const [emailOpen, setEmailOpen] = useState(() => lastSignInMethod() === 'email')
  const location = useLocation()
  useEffect(() => {
    trackPageView(creatingAccount ? '/sign-up' : '/sign-in', creatingAccount ? 'Create account' : 'Sign in')
  }, [creatingAccount])
  const [fullName, setFullName] = useState('')
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
    rememberSignInMethod('email')
    try {
      if (creatingAccount) {
        const name = fullName.trim()
        if (!name) throw new Error('Enter your full name.')
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name } },
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
      rememberSignInMethod('google')
      // Google brings the user back to the home address; remember where they were heading.
      rememberAfterLogin((location.state as { from?: string } | null)?.from ?? '/overview')
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
        {showHomeLink && <Link className="auth-home" to="/">← Back to home</Link>}
        <header className="auth-head">
          <span className="auth-brand"><span className="brand-mark"><Logo /></span>Ledgerly</span>
          <h1>{!client ? 'Set up Ledgerly' : creatingAccount ? 'Create your account' : 'Welcome back'}</h1>
          <p className="auth-description">
            {!client
              ? 'Set SB_URL and SB_ANON_KEY in a local environment file.'
              : creatingAccount
                ? 'Free during early access. No card needed.'
                : 'Sign in to your private Ledgerly account.'}
          </p>
        </header>
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
          <div className="auth-methods">
            <button className="button button-primary auth-google" type="button" disabled={busy} onClick={() => void signInWithGoogle()}>
              <span className="google-badge"><GoogleG /></span>
              Continue with Google
            </button>
            <p className="auth-fast">The fastest way in. No password to remember.</p>
            <div className="auth-divider"><span>or</span></div>
            {!emailOpen ? (
              <button className="button button-secondary auth-email-toggle" type="button" disabled={busy} onClick={() => setEmailOpen(true)}>
                {creatingAccount ? 'Sign up with email' : 'Continue with email'}
              </button>
            ) : (
              <form className="auth-form" onSubmit={(event) => void submit(event)}>
                {creatingAccount && <label>Full name<input autoComplete="name" required maxLength={MAX_NAME_LENGTH} value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>}
                <label>Email address<input type="email" autoComplete="email" autoFocus required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                <label>Password<input type="password" autoComplete={creatingAccount ? 'new-password' : 'current-password'} minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
                <button className="button button-secondary" type="submit" disabled={busy}>
                  {busy ? 'Please wait…' : creatingAccount ? 'Create account' : 'Sign in'}
                </button>
              </form>
            )}
            <Link className="auth-switch" to={creatingAccount ? '/sign-in' : '/sign-up'} state={location.state} onClick={() => { clearExternalError(); setError(''); setSuccess('') }}>
              {creatingAccount ? 'Already have an account? Sign in' : 'New to Ledgerly? Create an account'}
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
