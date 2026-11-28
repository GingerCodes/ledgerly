import type { ReactNode } from 'react'
import { Logo } from './components/Logo'
import { AppShell } from './app/AppShell'
import { FinanceProvider } from './app/FinanceProvider'
import { useAuthSession } from './app/useAuthSession'
import { useFinanceDatabase } from './app/useFinanceDatabase'
import { supabaseSetup } from './data/supabase-client'
import { displayName, fullName, yearViewOf } from './lib/user'
import { AuthScreen } from './features/auth/AuthScreen'
import './App.css'

function Splash({ title, children }: { title: string; children: ReactNode }) {
  return <main className="loading-screen"><div className="loading-mark"><Logo /></div><h1>{title}</h1>{children}</main>
}

function App() {
  const { client: supabase } = supabaseSetup
  const auth = useAuthSession(supabase)
  const { database, loadingError } = useFinanceDatabase(supabase, auth.session?.user.id)

  if (!auth.authReady) return <Splash title="Ledgerly"><p>Connecting…</p></Splash>

  if (!auth.session) {
    return (
      <AuthScreen
        client={supabase}
        configurationError={supabaseSetup.error}
        externalError={auth.authStateError}
        clearExternalError={auth.clearAuthError}
      />
    )
  }

  if (!database) {
    return (
      <Splash title="Personal Finance">
        {loadingError ? <><p className="form-error" role="alert">{loadingError}</p><p>Your finance data could not be opened. Check the setup and reload.</p></> : <p>Loading your private finance data…</p>}
      </Splash>
    )
  }

  return (
    <FinanceProvider database={database}>
      <AppShell userName={displayName(auth.session.user)} fullName={fullName(auth.session.user)} email={auth.session.user.email} onSignOut={auth.signOut} onUpdateName={auth.updateFullName} yearView={yearViewOf(auth.session.user)} onUpdateYearView={auth.updateYearView} />
    </FinanceProvider>
  )
}

export default App
