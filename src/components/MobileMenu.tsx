import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router'
import { X } from 'lucide-react'
import type { SectionLink } from '../app/navigation'

/** The phone menu: a panel sliding in from the left with the sections that do not fit in the bottom bar. */
export function MobileMenu({ items, onClose }: { items: SectionLink[]; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => closeRef.current?.focus(), [])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="menu-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div id="mobile-menu" className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="mobile-menu-head">
          <strong>Menu</strong>
          <button ref={closeRef} type="button" className="menu-close" aria-label="Close menu" onClick={onClose}><X size={20} /></button>
        </div>
        <nav aria-label="More sections">
          {items.map(({ id, label, icon: Icon, path }) => (
            <NavLink key={id} to={path} className={({ isActive }) => `menu-link ${isActive ? 'selected' : ''}`} onClick={onClose}>
              <Icon size={20} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
