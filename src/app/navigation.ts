import { ArrowLeftRight, BriefcaseBusiness, ChartNoAxesCombined, Landmark, Settings, type LucideIcon } from 'lucide-react'

export type Section = 'overview' | 'transactions' | 'reports' | 'accounts' | 'deposits' | 'settings'

export const sections: Array<{ id: Section; label: string; icon: LucideIcon; path: string }> = [
  { id: 'overview', label: 'Overview', icon: ChartNoAxesCombined, path: '/overview' },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, path: '/transactions' },
  { id: 'reports', label: 'Reports', icon: ChartNoAxesCombined, path: '/reports' },
  { id: 'accounts', label: 'Accounts', icon: Landmark, path: '/accounts' },
  { id: 'deposits', label: 'Fixed deposits', icon: BriefcaseBusiness, path: '/deposits' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings/categories' },
]

export const settingsTabs = [
  { id: 'categories', label: 'Categories' },
  { id: 'backups', label: 'Backup & import' },
  { id: 'account', label: 'Account' },
] as const

export type SettingsTab = typeof settingsTabs[number]['id']

/** The section a URL path belongs to, e.g. `/settings/account` -> settings; undefined for unknown paths. */
export function sectionOf(pathname: string): Section | undefined {
  const first = pathname.split('/')[1]
  return sections.find((section) => section.id === first)?.id
}

/** Screen title for a path (used for the browser tab and analytics); '' for paths that only redirect. */
export function pageTitle(pathname: string): string {
  const section = sections.find((item) => item.id === sectionOf(pathname))
  if (!section) return ''
  if (section.id !== 'settings') return section.label
  const tab = settingsTabs.find((item) => item.id === pathname.split('/')[2])
  return tab ? `Settings · ${tab.label}` : ''
}
