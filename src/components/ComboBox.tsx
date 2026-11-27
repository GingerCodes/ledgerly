import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export type ComboOption = { id: string; label: string }

export function ComboBox({ label, options, value, onChange, placeholder, disabled, className }: {
  label: string
  options: ComboOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const baseId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const selected = options.find((option) => option.id === value)
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const visible = words.length ? options.filter((option) => words.every((word) => option.label.toLowerCase().includes(word))) : options

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active, visible.length])

  const openList = () => {
    if (open || disabled) return
    setQuery('')
    setActive(Math.max(0, options.findIndex((option) => option.id === value)))
    setOpen(true)
  }
  const choose = (option: ComboOption | undefined) => {
    if (option) onChange(option.id)
    setOpen(false)
  }

  return (
    <div className={`combo-field ${className ?? ''}`}>
      <span id={`${baseId}-label`}>{label}</span>
      <div className="combo">
        <input
          className="combo-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${baseId}-list`}
          aria-labelledby={`${baseId}-label`}
          aria-autocomplete="list"
          aria-activedescendant={open && visible[active] ? `${baseId}-${active}` : undefined}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={open ? query : selected?.label ?? ''}
          onFocus={openList}
          onClick={openList}
          onBlur={() => setOpen(false)}
          onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true) }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); if (!open) openList(); else setActive((index) => Math.min(index + 1, visible.length - 1)) }
            else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)) }
            else if (event.key === 'Enter' && open) { event.preventDefault(); choose(visible[active]) }
            else if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false) }
          }}
        />
        <ChevronDown className="combo-chevron" size={16} aria-hidden="true" />
        {open && (
          <ul className="combo-list" id={`${baseId}-list`} role="listbox" aria-labelledby={`${baseId}-label`} ref={listRef}>
            {visible.length === 0 && <li className="combo-empty" role="presentation">No matching categories</li>}
            {visible.map((option, index) => (
              <li
                key={option.id || 'none'}
                id={`${baseId}-${index}`}
                role="option"
                aria-selected={option.id === value}
                className={`${index === active ? 'active' : ''} ${option.id === value ? 'selected' : ''}`}
                onMouseDown={(event) => { event.preventDefault(); choose(option) }}
                onMouseEnter={() => setActive(index)}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
