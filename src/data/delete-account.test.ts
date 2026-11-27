import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'
import { fakeSupabase } from '../test-support/fake-supabase'
import { FinanceDatabase } from './finance-database'

vi.mock('sql.js/dist/sql-wasm.wasm?url', () => ({
  default: createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm'),
}))

function clientWithDeleteResult(error: { message: string } | null) {
  const calls: string[] = []
  const client = fakeSupabase({}, { calls, rpcResults: { finance_delete_account: { data: null, error } } })
  return { client, calls }
}

describe('deleteAccount', () => {
  it('calls the database function and closes the database so a new sign-up loads fresh', async () => {
    const { client, calls } = clientWithDeleteResult(null)
    const database = await FinanceDatabase.open(client, 'delete-user')
    await database.deleteAccount()

    expect(calls).toContain('finance_delete_account')
    const reopened = await FinanceDatabase.open(client, 'delete-user')
    expect(reopened).not.toBe(database)
    await reopened.close()
  })

  it('surfaces the error and leaves the database usable when deletion fails', async () => {
    const { client } = clientWithDeleteResult({ message: 'permission denied' })
    const database = await FinanceDatabase.open(client, 'delete-user-2')

    await expect(database.deleteAccount()).rejects.toThrow('Could not delete your account: permission denied')
    expect(database.getAccounts().length).toBeGreaterThan(0)
    await database.close()
  })
})
