import { useRegisterSW } from 'virtual:pwa-register/react'

const CHECK_INTERVAL_MS = 60 * 60 * 1000

export default function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Look for a new deployment hourly and whenever the tab becomes visible again.
      const check = () => void registration.update().catch(() => undefined)
      setInterval(check, CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
    },
  })

  if (!needRefresh) return null
  return (
    <div className="update-banner" role="status">
      <span>A new version is available.</span>
      <button type="button" className="button button-primary" onClick={() => void updateServiceWorker(true)}>Reload to update</button>
    </div>
  )
}
