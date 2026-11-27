import { LogOut } from 'lucide-react'

/** Shown only in the installed app and on phones (see .signout-panel in App.css); elsewhere Sign out is in the sidebar. */
export function SignOutPanel({ onSignOut }: { onSignOut: () => void }) {
  return (
    <section className="panel signout-panel">
      <p className="eyebrow">SESSION</p>
      <h2>Sign out</h2>
      <p>Sign out of Ledgerly on this device.</p>
      <button type="button" className="button button-secondary" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
    </section>
  )
}
