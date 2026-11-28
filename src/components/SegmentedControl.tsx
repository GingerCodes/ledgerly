import type { CSSProperties } from 'react'

export interface SegmentedOption<T extends string> { value: T; label: string; /** Colours the sliding highlight, e.g. "expense". */ tone?: string }

/** Equal-width radio buttons with a highlight that slides to the chosen one. */
export function SegmentedControl<T extends string>({ options, value, onChange, label, labelledBy, className = '' }: {
  options: Array<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  label?: string
  labelledBy?: string
  className?: string
}) {
  const index = Math.max(0, options.findIndex((option) => option.value === value))
  const style = { '--n': options.length, '--i': index } as CSSProperties
  return (
    <div className={`segmented ${className}`} role="radiogroup" aria-label={label} aria-labelledby={labelledBy} style={style} data-tone={options[index]?.tone}>
      <span className="segmented-pill" aria-hidden="true" />
      {options.map((option) => (
        <button key={option.value} type="button" role="radio" aria-checked={option.value === value} className={option.value === value ? 'selected' : ''} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  )
}
