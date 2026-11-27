import { useState } from 'react'
import { useFinance } from '../../app/finance-context'

const CONFIRMATION = 'DELETE'

export function DeleteAccountPanel({ onShowBackup, onDeleted }: {
  onShowBackup: () => void
  /** Called after the account is gone, to end the session. */
  onDeleted: () => Promise<Error | null>
}) {
  const { database, showError } = useFinance()
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function deleteAccount() {
    setDeleting(true)
    try {
      await database.deleteAccount()
      const signOutError = await onDeleted()
      if (signOutError) showError(signOutError)
    } catch (error) {
      showError(error)
      setDeleting(false)
    }
  }

  return (
    <section className="panel danger-zone">
      <p className="eyebrow">DANGER ZONE</p>
      <h2>Delete account</h2>
      <p>
        This permanently deletes your Ledgerly account and everything in it: accounts, transactions, fixed deposits,
        categories and balance snapshots. It cannot be undone. Afterwards you can register again with the same email
        address and start fresh.
      </p>
      <p>
        <button type="button" className="text-button" onClick={onShowBackup}>Download an encrypted backup first</button>
        {' '}if you may want this data later.
      </p>
      <label>
        Type {CONFIRMATION} to confirm
        <input value={confirmation} autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} />
      </label>
      <button type="button" className="button button-danger" disabled={confirmation !== CONFIRMATION || deleting} onClick={() => void deleteAccount()}>
        {deleting ? 'Deleting…' : 'Delete my account'}
      </button>
    </section>
  )
}
