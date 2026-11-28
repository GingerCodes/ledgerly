// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCountUp } from './useCountUp'

function motion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }))
}

describe('useCountUp', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('goes straight to the value when the user prefers reduced motion', () => {
    motion(true)
    const { result } = renderHook(() => useCountUp(12_345))
    expect(result.current).toBe(12_345)
  })

  it('counts up from zero, then from the old value to a new one', () => {
    motion(false)
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    const { result, rerender } = renderHook(({ value }) => useCountUp(value, 500), { initialProps: { value: 1000 } })
    expect(result.current).toBe(0)
    act(() => { vi.advanceTimersByTime(250) })
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(1000)
    act(() => { vi.advanceTimersByTime(400) })
    expect(result.current).toBe(1000)

    rerender({ value: 400 })
    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current).toBeLessThan(1000)
    expect(result.current).toBeGreaterThan(400)
    act(() => { vi.advanceTimersByTime(600) })
    expect(result.current).toBe(400)
  })
})
