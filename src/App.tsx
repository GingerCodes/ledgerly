import { useEffect, useState, type ReactNode } from 'react'
import { Logo } from './components/Logo'
import { AppRoutes } from './app/AppRoutes'
import { AppShell } from './app/AppShell'
import { FinanceProvider } from './app/FinanceProvider'
import { useAuthSession } from './app/useAuthSession'
import { useFinanceDatabase } from './app/useFinanceDatabase'
import { supabaseSetup } from './data/supabase-client'
import { isStandalone } from './lib/install'
import { applyTheme, loadTheme } from './lib/theme'
import { displayName, fullName, yearViewOf } from './lib/user'
import { AuthScreen } from './features/auth/AuthScreen'
import './App.css'
import './motion.css'

function Splash({ title, children }: { title: string; children: ReactNode }) {
  return <main className="loading-screen"><div className="loading-mark"><Logo /></div><h1>{title}</h1>{children}</main>
}

function App() {
  const { client: supabase } = supabaseSetup
  const [standalone] = useState(isStandalone)
  const auth = useAuthSession(supabase)
  const userId = auth.session?.user.id
  // Signing in or out can change the default palette (older accounts keep Classic), so apply it again.
  useEffect(() => { applyTheme(loadTheme()) }, [userId])
  const { database, loadingError } = useFinanceDatabase(supabase, auth.session?.user.id)

  if (!auth.authReady) return <Splash title="Ledgerly"><p>Connecting…</p><div className="loading-bar" aria-hidden="true" /></Splash>

  const privateApp = !auth.session ? null : !database ? (
    <Splash title="Personal Finance">
      {loadingError ? <><p className="form-error" role="alert">{loadingError}</p><p>Your finance data could not be opened. Check the setup and reload.</p></> : <><p>Loading your private finance data…</p><div className="loading-bar" aria-hidden="true" /></>}
    </Splash>
  ) : (
    <FinanceProvider database={database}>
      <AppShell userName={displayName(auth.session.user)} fullName={fullName(auth.session.user)} email={auth.session.user.email} onSignOut={auth.signOut} onUpdateName={auth.updateFullName} yearView={yearViewOf(auth.session.user)} onUpdateYearView={auth.updateYearView} />
    </FinanceProvider>
  )

  return (
    <AppRoutes
      signedIn={Boolean(auth.session)}
      standalone={standalone}
      privateApp={privateApp}
      authScreen={(mode) => (
        <AuthScreen
          mode={mode}
          showHomeLink={!standalone}
          client={supabase}
          configurationError={supabaseSetup.error}
          externalError={auth.authStateError}
          clearExternalError={auth.clearAuthError}
        />
      )}
    />
  )
}

export default App
