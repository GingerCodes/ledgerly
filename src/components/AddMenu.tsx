import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'

export type AddKind = 'transaction' | 'account' | 'deposit'

/** "Add transaction" button; the arrow beside it offers a savings account or a fixed deposit instead. */
export function AddMenu({ onAdd }: { onAdd: (kind: AddKind) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const choose = (kind: AddKind) => { setOpen(false); onAdd(kind) }

  return (
    <div className="add-menu" ref={rootRef}>
      <button type="button" className="button button-primary top-add add-main" onClick={() => choose('transaction')}><Plus size={16} /> Add transaction</button>
      <button type="button" className="button button-primary top-add add-caret" aria-label="More things to add" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><ChevronDown size={16} /></button>
      {open && (
        <div className="add-popup" role="menu">
          <button type="button" role="menuitem" onClick={() => choose('transaction')}>Transaction</button>
          <button type="button" role="menuitem" onClick={() => choose('account')}>Savings account</button>
          <button type="button" role="menuitem" onClick={() => choose('deposit')}>Fixed deposit</button>
        </div>
      )}
    </div>
  )
}
