import { useState } from 'react'
import { BackupPage } from '../backup/BackupPage'
import { CategoriesPage } from '../categories/CategoriesPage'
import { DeleteAccountPanel } from './DeleteAccountPanel'

const tabs = [
  { id: 'categories', label: 'Categories' },
  { id: 'backups', label: 'Backup & import' },
  { id: 'account', label: 'Account' },
] as const

type TabId = typeof tabs[number]['id']

export function SettingsPage({ onAccountDeleted }: {
  /** Ends the session after the account has been deleted. */
  onAccountDeleted: () => Promise<Error | null>
}) {
  const [tab, setTab] = useState<TabId>('categories')

  return (
    <>
      <section className="page-heading">
        <div><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p className="page-subtitle">Organize your categories, keep your data safe and manage your account.</p></div>
      </section>
      <div className="settings-tabs" role="tablist" aria-label="Settings">
        {tabs.map(({ id, label }) => (
          <button key={id} type="button" role="tab" id={`settings-tab-${id}`} aria-selected={tab === id} aria-controls="settings-panel" className={tab === id ? 'selected' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div id="settings-panel" className="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${tab}`}>
        {tab === 'categories' && <CategoriesPage />}
        {tab === 'backups' && <BackupPage />}
        {tab === 'account' && <DeleteAccountPanel onShowBackup={() => setTab('backups')} onDeleted={onAccountDeleted} />}
      </div>
    </>
  )
}
