import type { PeriodMode } from '../lib/period'

const options: Array<{ mode: PeriodMode; label: string }> = [
  { mode: 'financial', label: 'Financial year' },
  { mode: 'calendar', label: 'Calendar year' },
]

/** Switches every year-based view between the Indian financial year (Apr to Mar) and the calendar year. */
export function PeriodToggle({ mode, onChange }: { mode: PeriodMode; onChange: (mode: PeriodMode) => void }) {
  return (
    <div className="segmented segmented-two period-toggle" role="radiogroup" aria-label="Year view">
      {options.map((option) => (
        <button key={option.mode} type="button" role="radio" aria-checked={mode === option.mode} className={mode === option.mode ? 'selected' : ''} onClick={() => onChange(option.mode)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}
