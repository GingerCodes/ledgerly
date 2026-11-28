// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Logo } from './Logo'

afterEach(() => { cleanup(); delete document.documentElement.dataset.palette })

describe('Logo', () => {
  it('shows the green coin in Classic and the violet mark in Aurora, and follows palette changes while on screen', async () => {
    document.documentElement.dataset.palette = 'classic'
    const { container } = render(<Logo />)
    const logo = () => container.querySelector('img')!
    expect(logo().getAttribute('src')).toBe('/favicon.svg')

    await act(async () => {
      document.documentElement.dataset.palette = 'aurora'
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(logo().getAttribute('src')).toBe('/favicon-aurora.svg')
  })
})
