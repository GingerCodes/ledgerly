/** All the words on the home page, in one place. Every claim must be true of the app today (see the guard test). */
import { CalendarClock, ChartNoAxesCombined, EyeOff, FileText, Landmark, Lock, ShieldCheck, Smartphone, Trash2, Zap, type LucideIcon } from 'lucide-react'

export const HERO = {
  eyebrow: 'Personal finance for India',
  title: 'See where every rupee goes.',
  text: 'Track spending, savings accounts and fixed deposits in one private place. Built for Indian households: rupees, April–March years, and FDs that pay out quarterly.',
  microcopy: 'Free during early access · No card needed',
}

export const TRUST: Array<{ icon: LucideIcon; label: string }> = [
  { icon: ShieldCheck, label: 'No bank logins' },
  { icon: EyeOff, label: 'No SMS or email reading' },
  { icon: Lock, label: 'Your data stays in your account' },
  { icon: Trash2, label: 'Delete everything any time' },
]

export const STEPS = [
  { title: 'Add your accounts', text: 'Start with cash, your savings accounts and any fixed deposits.' },
  { title: 'Record as you go', text: 'Add an expense in seconds, or bring in past transactions from a CSV file.' },
  { title: 'See the picture', text: 'Watch your month, your net worth and where the money goes take shape.' },
]

export const BENEFITS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Zap, title: 'Add expenses in seconds', text: 'Smart category suggestions remember how you label things, and “save and add another” keeps a batch moving.' },
  { icon: Landmark, title: 'Everything in one place', text: 'Cash, savings accounts and fixed deposits sit side by side, with clear totals for each.' },
  { icon: CalendarClock, title: 'Never miss a deposit', text: 'See what matures in the next 90 days and which interest payouts are due, then record each one in seconds.' },
  { icon: ChartNoAxesCombined, title: 'Understand your month', text: 'Income, spending and savings compared with last month, a spending breakdown and your net worth over time.' },
  { icon: FileText, title: 'Answer any question', text: 'Reports by date, account and category, with a plain-English summary and CSV export.' },
  { icon: Smartphone, title: 'Feels like an app', text: 'Install it on your phone, switch between light and dark, and pick the colour theme you like.' },
]

export const INDIA_POINTS = [
  'Amounts in rupees, formatted the Indian way',
  'April–March financial year, or the calendar year if you prefer',
  'FD interest paid out monthly, quarterly, half-yearly or yearly',
  'Spreadsheet-friendly CSV exports',
]

export const PRIVACY_POINTS = [
  { title: 'Kept in your own account', text: 'Your records live in your private account, separated from every other user’s by the database itself.' },
  { title: 'Encrypted backups', text: 'Download a backup locked with a passphrase that only you know.' },
  { title: 'Analytics only if you allow it', text: 'Usage analytics stay off unless you switch them on.' },
  { title: 'Yours to take or delete', text: 'Export to CSV, or delete your account and everything in it whenever you like.' },
]

export const COMPARE = {
  columns: ['Auto-sync apps', 'Spreadsheets', 'Ledgerly'],
  rows: [
    ['Needs your bank login or messages', 'Usually', 'No', 'No'],
    ['Fixed deposits and payouts built in', 'Often limited', 'Build it yourself', 'Yes'],
    ['Works well on your phone', 'Yes', 'Awkward', 'Yes, installs like an app'],
    ['Indian financial year and rupee formats', 'Varies', 'Set up yourself', 'Built in'],
    ['You can export or delete your data', 'Varies', 'Yes', 'Yes, any time'],
  ],
  note: 'A general comparison; individual apps differ.',
}

export const FAQ = [
  { q: 'Is Ledgerly free?', a: 'Ledgerly is free during early access, and you do not need a card to sign up. If that changes, we will tell you before it does.' },
  { q: 'Does it connect to my bank?', a: 'No. You add transactions yourself, or import them from a CSV file. That is why Ledgerly never needs your bank login, card details or access to your messages.' },
  { q: 'Where is my data, and who can see it?', a: 'Your records are stored in your private account in a cloud database, and each user’s data is kept separate from everyone else’s. Backups you download are encrypted with a passphrase of your choice.' },
  { q: 'Can I use it on my phone?', a: 'Yes. Open Ledgerly in your phone’s browser and add it to your home screen to use it like an app. It needs an internet connection.' },
  { q: 'Can I take my data out?', a: 'Yes. Export transactions and reports as CSV, download an encrypted backup, or delete your account and everything in it from Settings.' },
  { q: 'Does it handle fixed deposits that pay interest?', a: 'Yes. Record a deposit as compounding, simple interest at maturity, or interest paid out monthly, quarterly, half-yearly or yearly, then log each payout as it arrives.' },
  { q: 'Does it work with the Indian financial year?', a: 'Yes. Choose the April–March financial year or the calendar year once in Settings, and your overview, transactions and report defaults follow it.' },
]
