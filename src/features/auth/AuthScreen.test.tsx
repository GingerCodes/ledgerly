// @vitest-environment jsdom
import type { SupabaseClient } from '@supabase/supabase-js'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthScreen } from './AuthScreen'

afterEach(cleanup)

function setup() {
  const signUp = vi.fn(async () => ({ data: { session: null }, error: null }))
  const client = { auth: { signUp, signInWithPassword: vi.fn(), signInWithOAuth: vi.fn() } } as unknown as SupabaseClient
  function Screen() {
    const { pathname } = useLocation()
    return <AuthScreen mode={pathname === '/sign-up' ? 'sign-up' : 'sign-in'} showHomeLink client={client} configurationError="" externalError="" clearExternalError={() => undefined} />
  }
  render(<MemoryRouter initialEntries={['/sign-in']}><Routes><Route path="*" element={<Screen />} /></Routes></MemoryRouter>)
  return { signUp }
}

describe('AuthScreen registration', () => {
  it('offers a way back to the home page, and links between sign in and create account', async () => {
    setup()
    expect(screen.getByRole('link', { name: /Back to home/ }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('heading', { name: 'Sign in to Ledgerly' })).toBeTruthy()
    await userEvent.click(screen.getByRole('link', { name: /Create an account/ }))
    expect(screen.getByRole('heading', { name: 'Create your Ledgerly account' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Already have an account/ }).getAttribute('href')).toBe('/sign-in')
  })

  it('only asks for the full name when creating an account, and saves it with the sign-up', async () => {
    const { signUp } = setup()
    expect(screen.queryByLabelText('Full name')).toBeNull()

    await userEvent.click(screen.getByRole('link', { name: /Create an account/ }))
    await userEvent.type(screen.getByLabelText('Full name'), '  Alex Jose ')
    await userEvent.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'a-long-password-1')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(signUp).toHaveBeenCalledWith({ email: 'alex@example.com', password: 'a-long-password-1', options: { data: { full_name: 'Alex Jose' } } })
  })

  it('rejects a blank name without calling sign-up', async () => {
    const { signUp } = setup()
    await userEvent.click(screen.getByRole('link', { name: /Create an account/ }))
    await userEvent.type(screen.getByLabelText('Full name'), '   ')
    await userEvent.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'a-long-password-1')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(signUp).not.toHaveBeenCalled()
  })
})
