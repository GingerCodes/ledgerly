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
