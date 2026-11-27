import { useEffect, useState } from 'react'
import { isIos, isStandalone, recentlyDismissed, rememberDismissal } from '../lib/install'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Offers to install the app when it is opened in a browser. Chrome, Edge and Android fire
 * `beforeinstallprompt` only if the app is not already installed; iOS has no such event, so it gets
 * "Add to Home Screen" instructions instead. Never shown inside the installed app.
 */
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(() => isStandalone() || recentlyDismissed())

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault() // keep the event so we can show our own prompt
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setHidden(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const ios = isIos()
  if (hidden || (!installEvent && !ios)) return null

  function dismiss() {
    rememberDismissal()
    setHidden(true)
  }

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    setInstallEvent(null)
    if (outcome === 'dismissed') dismiss()
    else setHidden(true)
  }

  return (
    <div className="install-banner" role="region" aria-label="Install the app">
      <span>
        <b>Install Ledgerly</b>
        {installEvent ? 'Add it to your device for quick access, full screen.' : 'Tap the Share button, then "Add to Home Screen".'}
      </span>
      <span className="install-actions">
        {installEvent && <button type="button" className="button button-primary" onClick={() => void install()}>Install</button>}
        <button type="button" className="button button-secondary" onClick={dismiss}>Not now</button>
      </span>
    </div>
  )
}
