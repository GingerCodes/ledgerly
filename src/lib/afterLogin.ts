const AFTER_LOGIN_KEY = 'ledgerly-after-login'

/** Remembers where to go once Google sign-in brings the user back to the home address. */
export function rememberAfterLogin(path: string): void {
  try {
    sessionStorage.setItem(AFTER_LOGIN_KEY, path)
  } catch {
    // storage blocked: the user simply lands on the home page after Google sign-in
  }
}

export function peekAfterLogin(): string | null {
  try {
    return safePath(sessionStorage.getItem(AFTER_LOGIN_KEY))
  } catch {
    return null
  }
}

export function clearAfterLogin(): void {
  try {
    sessionStorage.removeItem(AFTER_LOGIN_KEY)
  } catch {
    // nothing to clear
  }
}

/** Only in-app paths are accepted, so a stored or passed value can never send the user to another site. */
export function safePath(path: unknown): string | null {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : null
}

