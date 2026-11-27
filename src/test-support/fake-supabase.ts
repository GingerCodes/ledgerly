import type { SupabaseClient } from '@supabase/supabase-js'

export const testAccount = (id: string, name: string, openingBalancePaise: number) => ({
  id, name, type: id === 'CASH' ? 'cash' : 'savings', institution: id === 'CASH' ? '' : 'HDFC',
  account_number: id === 'CASH' ? '' : `0000${id}`, status: 'active', opening_date: '2026-01-01',
  opening_balance_paise: openingBalancePaise, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
})

/** A Supabase client that serves one in-memory snapshot and accepts every save. */
export function fakeSupabase(snapshot: Record<string, unknown[]> = {}): SupabaseClient {
  return {
    rpc: async (name: string) => name === 'finance_load_snapshot'
      ? {
        data: {
          revision: 1,
          accounts: [testAccount('CASH', 'Cash', 0), testAccount('SB1', 'Savings', 1_000_000)],
          categories: [{ id: 'food', name: 'Food', parent_category_id: null, active: true }],
          transactions: [], fixed_deposits: [], balance_snapshots: [], transaction_changes: [],
          ...snapshot,
        },
        error: null,
      }
      : { data: 2, error: null },
  } as unknown as SupabaseClient
}
