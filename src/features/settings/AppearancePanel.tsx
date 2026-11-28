import { useState } from 'react'
import { loadTheme, saveTheme, THEMES, type Theme } from '../../lib/theme'

/** Colour theme. Saved on this device only, so a phone and a computer can differ. */
export function AppearancePanel() {
  const [theme, setTheme] = useState<Theme>(loadTheme)

  function choose(next: Theme) {
    setTheme(next)
    saveTheme(next)
  }

  return (
    <section className="panel profile-panel">
      <p className="eyebrow">APPEARANCE</p>
      <h2>Theme</h2>
      <p>Choose a light or dark look, or follow your device. This is saved on this device only.</p>
      <div className="segmented" role="radiogroup" aria-label="Theme">
        {THEMES.map((option) => (
          <button key={option.id} type="button" role="radio" aria-checked={theme === option.id} className={theme === option.id ? 'selected' : ''} onClick={() => choose(option.id)}>
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}
