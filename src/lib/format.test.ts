import { describe, expect, it } from 'vitest'
import { formatCompactRupees } from './format'

describe('formatCompactRupees', () => {
  it('uses Indian units', () => {
    expect(formatCompactRupees(0)).toBe('₹0')
    expect(formatCompactRupees(95_000)).toBe('₹950')
    expect(formatCompactRupees(12_345_00)).toBe('₹12.35 K')
    expect(formatCompactRupees(40_835_000)).toBe('₹4.08 L')
    expect(formatCompactRupees(-250_000_000)).toBe('−₹25 L')
    expect(formatCompactRupees(120_000_000_00)).toBe('₹12 Cr')
  })
})
