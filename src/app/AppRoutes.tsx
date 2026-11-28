import { useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { LandingPage } from '../features/landing/LandingPage'
import { clearAfterLogin, peekAfterLogin, safePath } from '../lib/afterLogin'

function Home({ signedIn, standalone }: { signedIn: boolean; standalone: boolean }) {
  const after = signedIn ? peekAfterLogin() : null
  useEffect(() => { if (after) clearAfterLogin() }, [after])
  if (after) return <Navigate to={after} replace />
  // The installed app never shows the marketing page: it opens straight at sign-in or the dashboard.
  if (standalone) return <Navigate to={signedIn ? '/overview' : '/sign-in'} replace />
  return <LandingPage signedIn={signedIn} />
}

function SignInOnly({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const location = useLocation()
  if (signedIn) return <Navigate to={safePath((location.state as { from?: string } | null)?.from) ?? '/overview'} replace />
  return <>{children}</>
}

function RequireSignIn({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const { pathname, search } = useLocation()
  if (!signedIn) return <Navigate to="/sign-in" replace state={{ from: pathname + search }} />
  return <>{children}</>
}

/**
 * The top-level screens. `/` is the marketing home page in a browser and goes straight to sign-in (or the dashboard)
 * in the installed app; `/sign-in` and `/sign-up` are the account forms; everything else is the app and needs a session.
 */
export function AppRoutes({ signedIn, standalone, authScreen, privateApp }: {
  signedIn: boolean
  standalone: boolean
  authScreen: (mode: 'sign-in' | 'sign-up') => ReactNode
  privateApp: ReactNode
}) {
  return (
    <Routes>
      <Route path="/" element={<Home signedIn={signedIn} standalone={standalone} />} />
      <Route path="/sign-in" element={<SignInOnly signedIn={signedIn}>{authScreen('sign-in')}</SignInOnly>} />
      <Route path="/sign-up" element={<SignInOnly signedIn={signedIn}>{authScreen('sign-up')}</SignInOnly>} />
      <Route path="*" element={<RequireSignIn signedIn={signedIn}>{privateApp}</RequireSignIn>} />
    </Routes>
  )
}
