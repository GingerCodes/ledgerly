import type { PeriodMode } from '../lib/period'
import { SegmentedControl } from './SegmentedControl'

const options: Array<{ value: PeriodMode; label: string }> = [
  { value: 'financial', label: 'Financial year' },
  { value: 'calendar', label: 'Calendar year' },
]

/** Switches every year-based view between the Indian financial year (Apr to Mar) and the calendar year. */
export function PeriodToggle({ mode, onChange }: { mode: PeriodMode; onChange: (mode: PeriodMode) => void }) {
  return <SegmentedControl options={options} value={mode} onChange={onChange} label="Year view" className="period-toggle" />
}
