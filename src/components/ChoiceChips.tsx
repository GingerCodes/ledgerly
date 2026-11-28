import { useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface Chip { id: string; label: string }

/** A single-choice row of tappable chips. Arrow keys move between them; `allowClear` lets a second tap on the chosen chip unselect it. */
export function ChoiceChips({ options, value, onChange, labelledBy, allowClear = false, children }: {
  options: Chip[]
  value: string
  onChange: (id: string) => void
  labelledBy: string
  allowClear?: boolean
  /** Extra controls shown after the chips, e.g. a "More…" button. */
  children?: ReactNode
}) {
  const group = useRef<HTMLDivElement>(null)
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = (index + step + options.length) % options.length
    onChange(options[next].id)
    group.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
  }
  const tabbable = Math.max(0, options.findIndex((option) => option.id === value))
  return (
    <div className="chips" role="radiogroup" aria-labelledby={labelledBy} ref={group}>
      {options.map((option, index) => (
        <button
          key={option.id || 'none'}
          type="button"
          role="radio"
          aria-checked={option.id === value}
          tabIndex={index === tabbable ? 0 : -1}
          className={`chip${option.id === value ? ' selected' : ''}`}
          onClick={() => onChange(allowClear && option.id === value ? '' : option.id)}
          onKeyDown={(event) => move(event, index)}
        >
          {option.label}
        </button>
      ))}
      {children}
    </div>
  )
}
