import { useState } from 'react'
import { useFinance } from '../../app/finance-context'
import { PeriodToggle } from '../../components/PeriodToggle'
import type { PeriodMode } from '../../lib/period'

export function PreferencesPanel({ yearView, onSave }: {
  yearView: PeriodMode
  /** Saves the preference; resolves to the error, if any. */
  onSave: (mode: PeriodMode) => Promise<Error | null>
}) {
  const { showSuccess, showError } = useFinance()
  const [pending, setPending] = useState<PeriodMode | null>(null)
  const shown = pending ?? yearView

  async function choose(mode: PeriodMode) {
    if (mode === shown) return
    setPending(mode)
    const error = await onSave(mode)
    setPending(null)
    if (error) showError(error)
    else showSuccess('Year view updated.')
  }

  return (
    <section className="panel profile-panel">
      <p className="eyebrow">PREFERENCES</p>
      <h2>Year view</h2>
      <p>
        Choose how years are counted on the Overview, the Transactions list and the report defaults. The Indian financial
        year runs from 1 April to 31 March. This is saved on your account, so it applies on every device.
      </p>
      <PeriodToggle mode={shown} onChange={(mode) => void choose(mode)} />
    </section>
  )
}
