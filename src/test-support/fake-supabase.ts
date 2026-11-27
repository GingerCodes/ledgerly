import type { SupabaseClient } from '@supabase/supabase-js'

export const testAccount = (id: string, name: string, openingBalancePaise: number) => ({
  id, name, type: id === 'CASH' ? 'cash' : 'savings', institution: id === 'CASH' ? '' : 'HDFC',
  account_number: id === 'CASH' ? '' : `0000${id}`, status: 'active', opening_date: '2026-01-01',
  opening_balance_paise: openingBalancePaise, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
})

export interface FakeSupabaseOptions {
  /** Replaces the response of a named RPC, e.g. to simulate a failure. */
  rpcResults?: Record<string, { data: unknown; error: { message: string } | null }>
  /** Receives the name of every RPC called. */
  calls?: string[]
}

/** A Supabase client that serves one in-memory snapshot and accepts every save. */
export function fakeSupabase(snapshot: Record<string, unknown[]> = {}, options: FakeSupabaseOptions = {}): SupabaseClient {
  return {
    rpc: async (name: string) => {
      options.calls?.push(name)
      return options.rpcResults?.[name] ?? defaultResult(name, snapshot)
    },
  } as unknown as SupabaseClient
}

function defaultResult(name: string, snapshot: Record<string, unknown[]>) {
  return name === 'finance_load_snapshot'
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
    : { data: 2, error: null }
}
