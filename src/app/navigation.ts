import { ArrowLeftRight, BriefcaseBusiness, ChartNoAxesCombined, FolderTree, Landmark, ShieldCheck, type LucideIcon } from 'lucide-react'

export type Section = 'overview' | 'transactions' | 'reports' | 'accounts' | 'deposits' | 'categories' | 'backups'

export const sections: Array<{ id: Section; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Overview', icon: ChartNoAxesCombined },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'reports', label: 'Reports', icon: ChartNoAxesCombined },
  { id: 'accounts', label: 'Accounts', icon: Landmark },
  { id: 'deposits', label: 'Fixed deposits', icon: BriefcaseBusiness },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'backups', label: 'Backup & import', icon: ShieldCheck },
]
