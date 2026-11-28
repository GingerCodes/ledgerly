const INITIAL_TIME = new Date()
export const CURRENT_YEAR = INITIAL_TIME.getFullYear()
export const CURRENT_HOUR = INITIAL_TIME.getHours()
export const CURRENT_DATE = todayIso()
const REPORT_MONTH_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function formatReportMonth(month: string): string {
  return REPORT_MONTH_FORMATTER.format(new Date(`${month}-01T00:00:00.000Z`))
}

/** An ISO date moved by whole days (local calendar, so it is safe across month ends and daylight-saving changes). */
export function shiftIsoDate(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const moved = new Date(year, month - 1, day + days)
  return `${moved.getFullYear()}-${String(moved.getMonth() + 1).padStart(2, '0')}-${String(moved.getDate()).padStart(2, '0')}`
}
