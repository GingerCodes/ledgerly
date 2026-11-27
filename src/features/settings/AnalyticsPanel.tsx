import { useState } from 'react'
import { analyticsAvailable, getConsent, setConsent } from '../../lib/analytics'

/** Lets the user change their analytics choice later. Not shown when analytics is not configured. */
export function AnalyticsPanel() {
  const [allowed, setAllowed] = useState(() => getConsent() === 'granted')
  if (!analyticsAvailable()) return null

  return (
    <section className="panel profile-panel">
      <p className="eyebrow">PRIVACY</p>
      <h2>Usage analytics</h2>
      <p>Google Analytics counts which screens are opened, with basic device and location details. Your transactions, balances and name are never sent.</p>
      <label className="check-row">
        <input type="checkbox" checked={allowed} onChange={(event) => { setAllowed(event.target.checked); setConsent(event.target.checked ? 'granted' : 'denied') }} />
        Share anonymous usage analytics
      </label>
    </section>
  )
}
