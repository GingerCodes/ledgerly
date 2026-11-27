import { CircleHelp } from 'lucide-react'

export function EmptyState({ children }: { children: string }) {
  return <div className="empty-state"><CircleHelp size={20} />{children}</div>
}
