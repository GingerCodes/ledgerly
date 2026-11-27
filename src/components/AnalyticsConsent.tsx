import { useState } from 'react'
import { analyticsAvailable, getConsent, setConsent } from '../lib/analytics'

/** Asks once whether anonymous usage analytics may be turned on. Hidden when analytics is not configured or already answered. */
export function AnalyticsConsent() {
  const [answered, setAnswered] = useState(() => !analyticsAvailable() || getConsent() !== null)
  if (answered) return null

  function answer(value: 'granted' | 'denied') {
    setConsent(value)
    setAnswered(true)
  }

  return (
    <div className="install-banner" role="region" aria-label="Usage analytics">
      <span>
        <b>Help improve Ledgerly?</b>
        Allow Google Analytics to count which screens are opened, with basic device and location details. Your transactions, balances and name are never sent.
      </span>
      <span className="install-actions">
        <button type="button" className="button button-primary" onClick={() => answer('granted')}>Allow</button>
        <button type="button" className="button button-secondary" onClick={() => answer('denied')}>No thanks</button>
      </span>
    </div>
  )
}
