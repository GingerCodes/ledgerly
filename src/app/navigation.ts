import { ArrowLeftRight, BriefcaseBusiness, ChartNoAxesCombined, Landmark, Settings, type LucideIcon } from 'lucide-react'

export type Section = 'overview' | 'transactions' | 'reports' | 'accounts' | 'deposits' | 'settings'

export const sections: Array<{ id: Section; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Overview', icon: ChartNoAxesCombined },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'reports', label: 'Reports', icon: ChartNoAxesCombined },
  { id: 'accounts', label: 'Accounts', icon: Landmark },
  { id: 'deposits', label: 'Fixed deposits', icon: BriefcaseBusiness },
  { id: 'settings', label: 'Settings', icon: Settings },
]
