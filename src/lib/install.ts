const DISMISS_KEY = 'ledgerly-install-dismissed-at'
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000

/** True when running as an installed app: a standalone window (Chrome, Edge, Android) or the iOS Home Screen app. */
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** iPhone and iPad (iPadOS reports itself as a Mac with a touch screen). iOS has no install prompt API. */
export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** True if the user closed the install prompt in the last 30 days. */
export function recentlyDismissed(now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return at > 0 && now - at < DISMISS_MS
  } catch {
    return false // storage blocked: just show the prompt
  }
}

export function rememberDismissal(now = Date.now()): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(now))
  } catch {
    // storage blocked: the prompt will simply reappear next visit
  }
}
