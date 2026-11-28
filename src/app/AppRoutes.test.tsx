// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './AppRoutes'

function Where() {
  const { pathname } = useLocation()
  return <output data-testid="where">{pathname}</output>
}

function setup(path: string, { signedIn = false, standalone = false, state }: { signedIn?: boolean; standalone?: boolean; state?: unknown } = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Where />
      <AppRoutes
        signedIn={signedIn}
        standalone={standalone}
        authScreen={(mode) => <p>auth screen: {mode}</p>}
        privateApp={<p>the app</p>}
      />
    </MemoryRouter>,
  )
}
const where = () => screen.getByTestId('where').textContent

describe('AppRoutes', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value), removeItem: (key: string) => void store.delete(key) })
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('shows the home page in a browser: Log in and Get started when signed out, Open dashboard when signed in', () => {
    setup('/')
    expect(screen.getByRole('heading', { level: 1, name: /See where every rupee goes/ })).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Log in' })[0].getAttribute('href')).toBe('/sign-in')
    expect(screen.getAllByRole('link', { name: /Get started/ })[0].getAttribute('href')).toBe('/sign-up')
    cleanup()
    setup('/', { signedIn: true })
    expect(screen.getAllByRole('link', { name: /Open dashboard/ })[0].getAttribute('href')).toBe('/overview')
    expect(screen.queryByRole('link', { name: /Get started/ })).toBeNull()
  })

  it('never shows the home page in the installed app: sign-in when signed out, the dashboard when signed in', () => {
    setup('/', { standalone: true })
    expect(where()).toBe('/sign-in')
    expect(screen.getByText('auth screen: sign-in')).toBeTruthy()
    cleanup()
    setup('/', { standalone: true, signedIn: true })
    expect(where()).toBe('/overview')
    expect(screen.getByText('the app')).toBeTruthy()
  })

  it('sends a signed-out visitor from an app address to sign-in, remembering where they were going', () => {
    setup('/reports')
    expect(where()).toBe('/sign-in')
    expect(screen.getByText('auth screen: sign-in')).toBeTruthy()
  })

  it('returns a signed-in user from sign-in to where they were going, or the dashboard', () => {
    setup('/sign-in', { signedIn: true, state: { from: '/reports' } })
    expect(where()).toBe('/reports')
    cleanup()
    setup('/sign-up', { signedIn: true })
    expect(where()).toBe('/overview')
    cleanup()
    setup('/sign-in', { signedIn: true, state: { from: 'https://elsewhere.example' } })
    expect(where()).toBe('/overview')
  })

  it('serves the app to a signed-in user and the right form for each sign-in address', () => {
    setup('/transactions', { signedIn: true })
    expect(screen.getByText('the app')).toBeTruthy()
    cleanup()
    setup('/sign-up')
    expect(screen.getByText('auth screen: sign-up')).toBeTruthy()
  })

  it('takes a user who just came back from Google straight to where they were heading', () => {
    sessionStorage.setItem('ledgerly-after-login', '/accounts')
    setup('/', { signedIn: true })
    expect(where()).toBe('/accounts')
    expect(sessionStorage.getItem('ledgerly-after-login')).toBeNull()
  })
})
