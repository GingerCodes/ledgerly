import { describe, expect, it } from 'vitest'
import { currentPeriodYear, makePeriod, periodYearOptions } from './period'

describe('periods', () => {
  it('builds calendar and Indian financial years', () => {
    expect(makePeriod('calendar', 2026)).toMatchObject({ startDate: '2026-01-01', endDate: '2026-12-31', label: '2026' })
    expect(makePeriod('financial', 2026)).toMatchObject({ startDate: '2026-04-01', endDate: '2027-03-31', label: 'FY 2026–27' })
    expect(makePeriod('financial', 2099).label).toBe('FY 2099–00')
  })

  it('puts January to March in the financial year that started the previous April', () => {
    expect(currentPeriodYear('financial', new Date(2026, 2, 31))).toBe(2025) // 31 Mar 2026
    expect(currentPeriodYear('financial', new Date(2026, 3, 1))).toBe(2026) // 1 Apr 2026
    expect(currentPeriodYear('calendar', new Date(2026, 2, 31))).toBe(2026)
  })

  it('lists the newest periods first', () => {
    expect(periodYearOptions('financial', 3, new Date(2026, 0, 15))).toEqual([2025, 2024, 2023])
  })
})
