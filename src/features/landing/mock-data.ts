import type { NetWorthPoint } from '../../domain/networth'

/** Made-up numbers for the illustrations on the home page. */
const totals = [4.1, 4.2, 4.15, 4.4, 4.55, 4.5, 4.8, 4.95, 5.05, 5.0, 5.3, 5.52]
export const MOCK_POINTS: NetWorthPoint[] = totals.map((lakh, index) => ({
  month: `2026-${String(index + 1).padStart(2, '0')}`,
  cashPaise: 0, savingsPaise: 0, fixedDepositsPaise: 0, totalPaise: lakh * 10_000_000,
}))

export const MOCK_SLICES = [
  { amountPaise: 46, label: 'Rent' },
  { amountPaise: 22, label: 'Groceries' },
  { amountPaise: 16, label: 'Travel' },
  { amountPaise: 10, label: 'Dining' },
  { amountPaise: 6, label: 'Other' },
]

export const MOCK_ROWS = [
  { name: 'Groceries', note: 'Food', amount: '−₹2,250', tone: 'out' },
  { name: 'Salary', note: 'Income', amount: '+₹95,000', tone: 'in' },
  { name: 'Metro card', note: 'Travel', amount: '−₹500', tone: 'out' },
]
