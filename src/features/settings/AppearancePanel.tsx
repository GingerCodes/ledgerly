import { useState } from 'react'
import { loadPalette, loadTheme, PALETTES, savePalette, saveTheme, THEMES, type Palette, type Theme } from '../../lib/theme'

/** Colour palette and light/dark mode. Saved on this device only, so a phone and a computer can differ. */
export function AppearancePanel() {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [palette, setPalette] = useState<Palette>(loadPalette)

  return (
    <section className="panel profile-panel">
      <p className="eyebrow">APPEARANCE</p>
      <h2>Theme</h2>
      <p>Pick a colour theme, then a light or dark look, or follow your device. This is saved on this device only.</p>
      <div className="palette-grid" role="radiogroup" aria-label="Colour theme">
        {PALETTES.map((option) => (
          <button key={option.id} type="button" role="radio" aria-checked={palette === option.id} className={`palette-option ${palette === option.id ? 'selected' : ''}`} onClick={() => { setPalette(option.id); savePalette(option.id) }}>
            <span className="palette-swatches" aria-hidden="true">{option.swatches.map((color) => <i key={color} style={{ background: color }} />)}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      <div className="segmented" role="radiogroup" aria-label="Mode">
        {THEMES.map((option) => (
          <button key={option.id} type="button" role="radio" aria-checked={theme === option.id} className={theme === option.id ? 'selected' : ''} onClick={() => { setTheme(option.id); saveTheme(option.id) }}>
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}
