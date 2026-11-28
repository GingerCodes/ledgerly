// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScrollIntoView } from './ScrollIntoView'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('ScrollIntoView', () => {
  it('scrolls its content into view each time it appears, smoothly unless the user prefers reduced motion', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }))
    const { rerender } = render(<ScrollIntoView key="a"><p>form a</p></ScrollIntoView>)
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'start' })

    rerender(<ScrollIntoView key="b"><p>form b</p></ScrollIntoView>) // a different form opens
    expect(scrollIntoView).toHaveBeenCalledTimes(2)

    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
    rerender(<ScrollIntoView key="c"><p>form c</p></ScrollIntoView>)
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'auto', block: 'start' })
  })
})
