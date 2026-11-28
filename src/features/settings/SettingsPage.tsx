import { Navigate, useNavigate, useParams } from 'react-router'
import { BackupPage } from '../backup/BackupPage'
import { CategoriesPage } from '../categories/CategoriesPage'
import { settingsTabs } from '../../app/navigation'
import type { PeriodMode } from '../../lib/period'
import { AnalyticsPanel } from './AnalyticsPanel'
import { DeleteAccountPanel } from './DeleteAccountPanel'
import { AppearancePanel } from './AppearancePanel'
import { PreferencesPanel } from './PreferencesPanel'
import { ProfilePanel } from './ProfilePanel'
import { SignOutPanel } from './SignOutPanel'

export function SettingsPage({ fullName, email, onSaveName, yearView, onSaveYearView, onSignOut, onAccountDeleted }: {
  fullName: string
  email: string | undefined
  /** Saves the full name; resolves to the error, if any. */
  onSaveName: (name: string) => Promise<Error | null>
  yearView: PeriodMode
  /** Saves the year view preference; resolves to the error, if any. */
  onSaveYearView: (mode: PeriodMode) => Promise<Error | null>
  onSignOut: () => void
  /** Ends the session after the account has been deleted. */
  onAccountDeleted: () => Promise<Error | null>
}) {
  const navigate = useNavigate()
  const { tab } = useParams()
  if (!settingsTabs.some((item) => item.id === tab)) return <Navigate to="/settings/categories" replace />

  return (
    <>
      <section className="page-heading">
        <div><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p className="page-subtitle">Organize your categories, keep your data safe and manage your account.</p></div>
      </section>
      <div className="settings-tabs" role="tablist" aria-label="Settings">
        {settingsTabs.map(({ id, label }) => (
          <button key={id} type="button" role="tab" id={`settings-tab-${id}`} aria-selected={tab === id} aria-controls="settings-panel" className={tab === id ? 'selected' : ''} onClick={() => navigate(`/settings/${id}`)}>{label}</button>
        ))}
      </div>
      <div id="settings-panel" className="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${tab}`}>
        {tab === 'categories' && <CategoriesPage />}
        {tab === 'backups' && <BackupPage />}
        {tab === 'account' && (
          <>
            <ProfilePanel fullName={fullName} email={email} onSave={onSaveName} />
            <PreferencesPanel yearView={yearView} onSave={onSaveYearView} />
            <AppearancePanel />
            <SignOutPanel onSignOut={onSignOut} />
            <AnalyticsPanel />
            <DeleteAccountPanel onShowBackup={() => navigate('/settings/backups')} onDeleted={onAccountDeleted} />
          </>
        )}
      </div>
    </>
  )
}
