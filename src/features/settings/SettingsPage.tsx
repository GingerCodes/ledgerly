import { useState } from 'react'
import { BackupPage } from '../backup/BackupPage'
import { CategoriesPage } from '../categories/CategoriesPage'

const tabs = [
  { id: 'categories', label: 'Categories', Panel: CategoriesPage },
  { id: 'backups', label: 'Backup & import', Panel: BackupPage },
] as const

type TabId = typeof tabs[number]['id']

export function SettingsPage() {
  const [tab, setTab] = useState<TabId>('categories')
  const { Panel } = tabs.find((item) => item.id === tab) ?? tabs[0]

  return (
    <>
      <section className="page-heading">
        <div><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p className="page-subtitle">Organize your categories and keep your data safe.</p></div>
      </section>
      <div className="settings-tabs" role="tablist" aria-label="Settings">
        {tabs.map(({ id, label }) => (
          <button key={id} type="button" role="tab" id={`settings-tab-${id}`} aria-selected={tab === id} aria-controls="settings-panel" className={tab === id ? 'selected' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div id="settings-panel" className="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${tab}`}>
        <Panel />
      </div>
    </>
  )
}
