import { createRequire } from 'node:module'
import initSqlJs from 'sql.js'
import { describe, expect, it, vi } from 'vitest'
import { fakeSupabase, type FakeSupabaseOptions } from '../test-support/fake-supabase'
import { FinanceDatabase } from './finance-database'

const wasmPath = createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm')
vi.mock('sql.js/dist/sql-wasm.wasm?url', () => ({ default: createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm') }))

const expense = (description: string) => ({
  date: '2026-04-02', type: 'expense' as const, accountId: 'CASH', fromAccountId: null, toAccountId: null,
  description, amountPaise: 2000, categoryId: null, notes: '',
})
const deposit = { institution: 'SBI', accountNumber: 'FD-1', principalPaise: 400_000, startDate: '2026-03-01', maturityDate: '2027-03-01', annualRateBasisPoints: 700, interestType: 'simple' as const, compoundsPerYear: 1, linkedAccountId: null, fundingAccountId: 'SB1', maturityInstruction: '', notes: '' }

describe('restoring a backup', () => {
  it('replaces the account with the backup and deletes everything that is not in it', async () => {
    const applied: NonNullable<FakeSupabaseOptions['applied']> = []
    const database = await FinanceDatabase.open(fakeSupabase({}, { applied }), 'restore-user-1')
    const backup = await database.getBackupBytes()

    const added = await database.saveTransaction(expense('Added after the backup'))
    expect(database.getTransactions('2026-04-01', '2026-04-30')).toHaveLength(1)
    applied.length = 0

    await database.restoreBackupBytes(backup)
    expect(database.getTransactions('2026-04-01', '2026-04-30')).toHaveLength(0)
    expect(applied[0].changes.transactions.delete).toEqual([added])
    await database.close()
  })

  it('accepts a backup made before fixed deposits had a funding account', async () => {
    const database = await FinanceDatabase.open(fakeSupabase(), 'restore-user-2')
    await database.saveFixedDeposit(deposit)
    const backup = await database.getBackupBytes()

    // Rebuild the backup the way an older app version stored it: no funding_account_id column.
    const sql = await initSqlJs({ locateFile: () => wasmPath })
    const old = new sql.Database(backup)
    old.run(`CREATE TABLE fd_old (
      id TEXT PRIMARY KEY, institution TEXT NOT NULL, account_number TEXT NOT NULL, principal_paise INTEGER NOT NULL,
      start_date TEXT NOT NULL, maturity_date TEXT NOT NULL, annual_rate_basis_points INTEGER NOT NULL,
      interest_type TEXT NOT NULL, compounds_per_year INTEGER NOT NULL, linked_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      maturity_instruction TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`)
    old.run(`INSERT INTO fd_old SELECT id, institution, account_number, principal_paise, start_date, maturity_date,
      annual_rate_basis_points, interest_type, compounds_per_year, linked_account_id, maturity_instruction, status, notes,
      created_at, updated_at FROM fixed_deposits`)
    old.run('DROP TABLE fixed_deposits')
    old.run('ALTER TABLE fd_old RENAME TO fixed_deposits')
    const oldBackup = old.export()
    old.close()

    await database.restoreBackupBytes(oldBackup)
    expect(database.getFixedDeposits()).toHaveLength(1)
    expect(database.getFixedDeposits()[0].fundingAccountId).toBeNull()
    await database.saveFixedDeposit({ ...deposit, id: database.getFixedDeposits()[0].id, fundingAccountId: 'SB1' }) // still editable afterwards
    expect(database.getFixedDeposits()[0].fundingAccountId).toBe('SB1')
    await database.close()
  })

  it('rejects a file that is not a finance database and leaves the data alone', async () => {
    const database = await FinanceDatabase.open(fakeSupabase(), 'restore-user-3')
    await database.saveTransaction(expense('Keep me'))
    await expect(database.restoreBackupBytes(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow('Backup validation failed')
    expect(database.getTransactions('2026-04-01', '2026-04-30')).toHaveLength(1)
    await database.close()
  })
})
