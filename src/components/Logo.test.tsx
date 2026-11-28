// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Logo } from './Logo'

afterEach(() => { cleanup(); delete document.documentElement.dataset.palette; delete document.documentElement.dataset.theme })

async function change(palette: string, theme: string) {
  await act(async () => {
    document.documentElement.dataset.palette = palette
    document.documentElement.dataset.theme = theme
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('Logo', () => {
  it('shows the green coin in Classic, and a brighter or deeper violet coin in Aurora light or dark, following changes live', async () => {
    document.documentElement.dataset.palette = 'classic'
    document.documentElement.dataset.theme = 'light'
    const { container } = render(<Logo />)
    const src = () => container.querySelector('img')!.getAttribute('src')
    expect(src()).toBe('/favicon.svg')

    await change('classic', 'dark')
    expect(src()).toBe('/favicon.svg')
    await change('aurora', 'light')
    expect(src()).toBe('/favicon-aurora-light.svg')
    await change('aurora', 'dark')
    expect(src()).toBe('/favicon-aurora-dark.svg')
  })
})
