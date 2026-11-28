// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BENEFITS, COMPARE, FAQ, HERO, INDIA_POINTS, PRIVACY_POINTS, STEPS, TRUST } from './content'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  beforeEach(() => {
    const store = new Map<string, string>([['ledgerly-palette', 'classic'], ['ledgerly-theme', 'dark']])
    vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) })
    document.head.innerHTML = '<meta name="theme-color" content="#245c48">'
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('has one main heading, the section anchors and every FAQ question', () => {
    render(<MemoryRouter><LandingPage signedIn={false} /></MemoryRouter>)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    for (const id of ['how', 'features', 'privacy', 'faq']) expect(document.getElementById(id)).toBeTruthy()
    for (const item of FAQ) expect(screen.getByText(item.q)).toBeTruthy()
    expect(screen.getAllByText(HERO.microcopy).length).toBeGreaterThan(0)
  })

  it('wears Aurora while it is on screen, keeps the visitor’s dark mode, and puts their palette back on leaving', () => {
    const { unmount } = render(<MemoryRouter><LandingPage signedIn={false} /></MemoryRouter>)
    expect(document.documentElement.dataset.palette).toBe('aurora')
    expect(document.documentElement.dataset.theme).toBe('dark')
    unmount()
    expect(document.documentElement.dataset.palette).toBe('classic')
  })

  it('only claims what the app really does: no ratings, testimonials, user counts or security guarantees', () => {
    const everything = JSON.stringify([HERO, TRUST.map((item) => item.label), STEPS, BENEFITS.map(({ title, text }) => ({ title, text })), INDIA_POINTS, PRIVACY_POINTS, COMPARE, FAQ]).toLowerCase()
    for (const banned of ['testimonial', 'rated', 'stars?', 'millions of', 'users trust', 'bank-grade', 'military', '100% secure', 'guarantee', 'trusted by', 'as seen', 'awards?', 'no ads']) {
      expect(everything, banned).not.toMatch(new RegExp(`\\b${banned}\\b`))
    }
  })
})
