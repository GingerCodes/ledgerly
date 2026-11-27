import { useState } from 'react'
import { CircleHelp, Download, FileUp, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useFinance } from '../../app/finance-context'
import { todayIso } from '../../lib/dates'
import { downloadFile } from '../../lib/format'
import { copyToArrayBuffer, decryptBackup, encryptBackup } from '../../data/encrypted-backup'
import { CsvImportPanel } from './CsvImportPanel'

export function BackupPage() {
  const { database, refresh, showSuccess, showError } = useFinance()
  const [backupPassphrase, setBackupPassphrase] = useState('')
  const [backupPassphraseConfirmation, setBackupPassphraseConfirmation] = useState('')
  const [restorePassphrase, setRestorePassphrase] = useState('')
  const [restoreFile, setRestoreFile] = useState<File | null>(null)

  async function createEncryptedBackup() {
    try {
      const bytes = await encryptBackup(await database.getBackupBytes(), backupPassphrase)
      downloadFile(`finance-backup-${todayIso()}.pfbackup`, new Blob([copyToArrayBuffer(bytes)], { type: 'application/octet-stream' }))
      setBackupPassphrase('')
      setBackupPassphraseConfirmation('')
      showSuccess('Encrypted backup downloaded. Store it somewhere safe.')
    } catch (error) {
      showError(error)
    }
  }

  async function restoreEncryptedBackup() {
    if (!restoreFile) {
      showError(new Error('Choose an encrypted backup file first.'))
      return
    }
    if (!window.confirm('Restore this backup and replace all finance data in your Supabase account? This cannot be undone.')) return
    try {
      const bytes = new Uint8Array(await restoreFile.arrayBuffer())
      await database.restoreBackupBytes(await decryptBackup(bytes, restorePassphrase))
      refresh()
      setRestoreFile(null)
      setRestorePassphrase('')
      showSuccess('Backup restored.')
    } catch (error) {
      showError(error)
    }
  }

  return (
            <>
              <section className="page-heading"><div><p className="eyebrow">KEEP YOUR DATA SAFE</p><h1>Backup & import</h1><p className="page-subtitle">Create an encrypted copy or restore from an earlier backup.</p></div></section>
              <div className="backup-grid">
                <section className="panel backup-card">
                  <div className="backup-icon"><LockKeyhole size={20} /></div><p className="eyebrow">ENCRYPTED BACKUP</p><h2>Take your data with you</h2><p>Create a password-protected backup file. Keep the passphrase separate; it cannot be recovered if lost.</p>
                  <label>Backup passphrase<input type="password" autoComplete="new-password" value={backupPassphrase} onChange={(event) => setBackupPassphrase(event.target.value)} placeholder="At least 12 characters" /></label>
                  <label>Confirm passphrase<input type="password" autoComplete="new-password" value={backupPassphraseConfirmation} onChange={(event) => setBackupPassphraseConfirmation(event.target.value)} /></label>
                  <button className="button button-primary" disabled={backupPassphrase.length < 12 || backupPassphrase !== backupPassphraseConfirmation} onClick={() => void createEncryptedBackup()}><Download size={16} /> Download encrypted backup</button>
                  <div className="security-note"><ShieldCheck size={16} /> AES-256-GCM encryption · passphrase-derived key</div>
                </section>
                <section className="panel backup-card">
                  <div className="backup-icon restore"><FileUp size={20} /></div><p className="eyebrow">RESTORE DATA</p><h2>Load a previous backup</h2><p>Restoring replaces all finance data in your Supabase account. Export a backup first if you need to keep both.</p>
                  <label>Encrypted backup file<input type="file" accept=".pfbackup,application/octet-stream" onChange={(event) => setRestoreFile(event.target.files?.[0] ?? null)} /></label>
                  <label>Backup passphrase<input type="password" autoComplete="current-password" value={restorePassphrase} onChange={(event) => setRestorePassphrase(event.target.value)} /></label>
                  <button className="button button-secondary" disabled={!restoreFile || !restorePassphrase} onClick={() => void restoreEncryptedBackup()}><FileUp size={16} /> Restore backup</button>
                </section>
              </div>
              <CsvImportPanel />
              <div className="data-warning"><CircleHelp size={17} /><span><b>Supabase cloud storage</b>Your records are stored in your authenticated Supabase account. Download encrypted backups regularly; the app cannot recover a lost backup passphrase.</span></div>
            </>
  )
}
