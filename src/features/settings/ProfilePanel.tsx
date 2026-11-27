import { useState, type FormEvent } from 'react'
import { useFinance } from '../../app/finance-context'
import { MAX_NAME_LENGTH } from '../../lib/user'

export function ProfilePanel({ fullName, email, onSave }: {
  fullName: string
  email: string | undefined
  /** Saves the name; resolves to the error, if any. */
  onSave: (name: string) => Promise<Error | null>
}) {
  const { showSuccess, showError } = useFinance()
  const [name, setName] = useState(fullName)
  const [saving, setSaving] = useState(false)
  const trimmed = name.trim()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!trimmed) return showError(new Error('Enter your full name.'))
    setSaving(true)
    const error = await onSave(trimmed)
    setSaving(false)
    if (error) showError(error)
    else {
      setName(trimmed)
      showSuccess('Name updated.')
    }
  }

  return (
    <form className="panel profile-panel" onSubmit={(event) => void submit(event)}>
      <p className="eyebrow">PROFILE</p>
      <h2>Your name</h2>
      {email && <p>Signed in as {email}</p>}
      <label>
        Full name
        <input value={name} autoComplete="name" required maxLength={MAX_NAME_LENGTH} onChange={(event) => setName(event.target.value)} />
      </label>
      <button type="submit" className="button button-primary" disabled={saving || !trimmed || trimmed === fullName}>
        {saving ? 'Saving…' : 'Save name'}
      </button>
    </form>
  )
}
