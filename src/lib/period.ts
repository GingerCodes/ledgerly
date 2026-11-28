export type PeriodMode = 'calendar' | 'financial'

export interface Period {
  mode: PeriodMode
  /** The year the period starts in: for the Indian financial year 2026-27 this is 2026. */
  year: number
  /** Inclusive ISO dates. */
  startDate: string
  endDate: string
  label: string
}

/** Calendar year (1 Jan to 31 Dec) or the Indian financial year (1 Apr to 31 Mar) starting in `year`. */
export function makePeriod(mode: PeriodMode, year: number): Period {
  if (mode === 'calendar') {
    return { mode, year, startDate: `${year}-01-01`, endDate: `${year}-12-31`, label: String(year) }
  }
  return {
    mode,
    year,
    startDate: `${year}-04-01`,
    endDate: `${year + 1}-03-31`,
    label: `FY ${year}–${String(year + 1).slice(2)}`,
  }
}

/** The period containing `today`. January to March belongs to the financial year that started the previous April. */
export function currentPeriodYear(mode: PeriodMode, today = new Date()): number {
  const year = today.getFullYear()
  return mode === 'financial' && today.getMonth() < 3 ? year - 1 : year
}

/** The most recent `count` period years, newest first. */
export function periodYearOptions(mode: PeriodMode, count = 10, today = new Date()): number[] {
  const first = currentPeriodYear(mode, today)
  return Array.from({ length: count }, (_, index) => first - index)
}

/** The saved preference (Settings → Account); anything unset or unknown means the Indian financial year. */
export function parsePeriodMode(value: unknown): PeriodMode {
  return value === 'calendar' ? 'calendar' : 'financial'
}

/** A single calendar month, `month` is `YYYY-MM`. */
export function monthPeriod(month: string): { startDate: string; endDate: string; label: string } {
  const [year, number] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, number, 0)).getUTCDate()
  const label = new Date(Date.UTC(year, number - 1, 1)).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return { startDate: `${month}-01`, endDate: `${month}-${String(lastDay).padStart(2, '0')}`, label }
}

/** The month `delta` months after `month` (negative goes back). */
export function shiftMonth(month: string, delta: number): string {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, number - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}
