import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type { SupabaseClient } from '@supabase/supabase-js'
import { maskAccountNumber } from '../lib/format'
import {
  accountLabel,
  isIsoDate,
  type Account,
  type BalanceSnapshot,
  type BalanceSnapshotInput,
  type Category,
  type FixedDeposit,
  type FixedDepositInput,
  type ImportedTransaction,
  type Transaction,
  type TransactionInput,
  type YearSummary,
} from '../domain/models'

const APPLICATION_ID = 1_347_866_450
const CURRENT_SCHEMA_VERSION = 1
/** Sent with every save. The database function refuses saves from older app versions (see 20261128100000_require_current_client.sql) so a stale cached copy cannot overwrite columns it does not know about. Raise it whenever a migration adds a column. */
const CLIENT_API_VERSION = 3
const snapshotTables = [
  'accounts',
  'categories',
  'transactions',
  'fixed_deposits',
  'balance_snapshots',
  'transaction_changes',
] as const

type SnapshotTable = typeof snapshotTables[number]
type CloudSnapshot = Record<SnapshotTable, SqlRow[]> & { revision: number }
type TableChanges = { upsert: SqlRow[]; delete: string[] }
type CloudChanges = Record<SnapshotTable, TableChanges>

const schema = `
  CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'savings')),
    institution TEXT NOT NULL DEFAULT '',
    account_number TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    opening_date TEXT NOT NULL,
    opening_balance_paise INTEGER NOT NULL DEFAULT 0 CHECK (opening_balance_paise >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_category_id TEXT REFERENCES categories(id) ON DELETE RESTRICT,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    UNIQUE (parent_category_id, name)
  );

  CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
    from_account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
    to_account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (
      (type = 'transfer'
        AND account_id IS NULL
        AND from_account_id IS NOT NULL
        AND to_account_id IS NOT NULL
        AND from_account_id <> to_account_id
        AND category_id IS NULL)
      OR
      (type IN ('expense', 'income')
        AND account_id IS NOT NULL
        AND from_account_id IS NULL
        AND to_account_id IS NULL)
    )
  );

  CREATE INDEX transactions_by_date ON transactions(date DESC);
  CREATE INDEX transactions_by_category_date ON transactions(category_id, date DESC);
  CREATE INDEX transactions_by_account_date ON transactions(account_id, date DESC);

  CREATE TABLE fixed_deposits (
    id TEXT PRIMARY KEY,
    institution TEXT NOT NULL,
    account_number TEXT NOT NULL,
    principal_paise INTEGER NOT NULL CHECK (principal_paise > 0),
    start_date TEXT NOT NULL,
    maturity_date TEXT NOT NULL,
    annual_rate_basis_points INTEGER NOT NULL CHECK (annual_rate_basis_points >= 0),
    interest_type TEXT NOT NULL CHECK (interest_type IN ('simple', 'compound')),
    compounds_per_year INTEGER NOT NULL CHECK (compounds_per_year BETWEEN 1 AND 365),
    linked_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    funding_account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
    maturity_instruction TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matured', 'closed')),
    closed_date TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (maturity_date >= start_date)
  );

  CREATE TABLE balance_snapshots (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    date TEXT NOT NULL,
    reported_balance_paise INTEGER NOT NULL CHECK (reported_balance_paise >= 0),
    source TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE INDEX snapshots_by_account_date ON balance_snapshots(account_id, date DESC);

  CREATE TABLE transaction_changes (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    changed_at TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    changed_fields_json TEXT NOT NULL
  );

  PRAGMA application_id = ${APPLICATION_ID};
  PRAGMA user_version = ${CURRENT_SCHEMA_VERSION};
`

const defaultCategories: Array<[string, string, string | null]> = [
  ['category-food', 'Food', null],
  ['category-groceries', 'Groceries', 'category-food'],
  ['category-dining', 'Dining', 'category-food'],
  ['category-housing', 'Housing', null],
  ['category-transport', 'Transport', null],
  ['category-utilities', 'Utilities', null],
  ['category-health', 'Health', null],
  ['category-personal', 'Personal', null],
  ['category-family', 'Family', null],
  ['category-education', 'Education', null],
  ['category-entertainment', 'Entertainment', null],
  ['category-fees', 'Fees and charges', null],
  ['category-other', 'Other', null],
]

type SqlRow = Record<string, SqlValue | boolean>

function readString(row: SqlRow, column: string): string {
  const value = row[column]
  if (typeof value !== 'string') throw new Error(`Database value "${column}" is not text.`)
  return value
}

function readNullableString(row: SqlRow, column: string): string | null {
  const value = row[column]
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw new Error(`Database value "${column}" is not text.`)
  return value
}

function readInteger(row: SqlRow, column: string): number {
  const value = row[column]
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(`Database value "${column}" is not a safe integer.`)
  }
  return value
}

function readBoolean(row: SqlRow, column: string): boolean {
  return readInteger(row, column) === 1
}

function readAccount(row: SqlRow): Account {
  return {
    id: readString(row, 'id'),
    name: readString(row, 'name'),
    type: readString(row, 'type') as Account['type'],
    institution: readString(row, 'institution'),
    accountNumber: readString(row, 'account_number'),
    status: readString(row, 'status') as Account['status'],
    openingDate: readString(row, 'opening_date'),
    openingBalancePaise: readInteger(row, 'opening_balance_paise'),
    currentBalancePaise: readInteger(row, 'current_balance_paise'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  }
}

function readCategory(row: SqlRow): Category {
  return {
    id: readString(row, 'id'),
    name: readString(row, 'name'),
    parentCategoryId: readNullableString(row, 'parent_category_id'),
    active: readBoolean(row, 'active'),
  }
}

function readTransaction(row: SqlRow): Transaction {
  return {
    id: readString(row, 'id'),
    date: readString(row, 'date'),
    type: readString(row, 'type') as Transaction['type'],
    accountId: readNullableString(row, 'account_id'),
    fromAccountId: readNullableString(row, 'from_account_id'),
    toAccountId: readNullableString(row, 'to_account_id'),
    description: readString(row, 'description'),
    amountPaise: readInteger(row, 'amount_paise'),
    categoryId: readNullableString(row, 'category_id'),
    notes: readString(row, 'notes'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  }
}

function readFixedDeposit(row: SqlRow): FixedDeposit {
  return {
    id: readString(row, 'id'),
    institution: readString(row, 'institution'),
    accountNumber: readString(row, 'account_number'),
    principalPaise: readInteger(row, 'principal_paise'),
    startDate: readString(row, 'start_date'),
    maturityDate: readString(row, 'maturity_date'),
    annualRateBasisPoints: readInteger(row, 'annual_rate_basis_points'),
    interestType: readString(row, 'interest_type') as FixedDeposit['interestType'],
    compoundsPerYear: readInteger(row, 'compounds_per_year'),
    linkedAccountId: readNullableString(row, 'linked_account_id'),
    fundingAccountId: readNullableString(row, 'funding_account_id'),
    closedDate: readNullableString(row, 'closed_date'),
    maturityInstruction: readString(row, 'maturity_instruction'),
    status: readString(row, 'status') as FixedDeposit['status'],
    notes: readString(row, 'notes'),
    createdAt: readString(row, 'created_at'),
    updatedAt: readString(row, 'updated_at'),
  }
}

function readBalanceSnapshot(row: SqlRow): BalanceSnapshot {
  return {
    id: readString(row, 'id'),
    accountId: readString(row, 'account_id'),
    date: readString(row, 'date'),
    reportedBalancePaise: readInteger(row, 'reported_balance_paise'),
    calculatedBalancePaise: readInteger(row, 'calculated_balance_paise'),
    source: readString(row, 'source'),
    notes: readString(row, 'notes'),
    createdAt: readString(row, 'created_at'),
  }
}

function currentTime(): string {
  return new Date().toISOString()
}

function newId(): string {
  return crypto.randomUUID()
}

function parseCloudSnapshot(value: unknown): CloudSnapshot {
  if (typeof value !== 'object' || value === null || !('revision' in value)) {
    throw new Error('The server returned an invalid finance snapshot.')
  }
  const record = value as Record<string, unknown>
  if (typeof record.revision !== 'number' || !Number.isSafeInteger(record.revision) || record.revision < 0) {
    throw new Error('The server returned an invalid finance revision.')
  }

  const snapshot = { revision: record.revision } as CloudSnapshot
  for (const table of snapshotTables) {
    const rows = record[table]
    if (!Array.isArray(rows)) throw new Error(`The server returned invalid ${table} data.`)
    snapshot[table] = rows.map((row) => {
      if (typeof row !== 'object' || row === null || Array.isArray(row)) {
        throw new Error(`The server returned an invalid row in ${table}.`)
      }
      const values: SqlRow = {}
      for (const [column, item] of Object.entries(row)) {
        if (item === null || typeof item === 'string') {
          values[column] = item
        } else if (typeof item === 'number' && Number.isSafeInteger(item)) {
          values[column] = item
        } else if (typeof item === 'boolean') {
          values[column] = item ? 1 : 0
        } else {
          throw new Error(`The server returned an unsupported value in ${table}.${column}.`)
        }
      }
      return values
    })
  }
  return snapshot
}

function insertSnapshotRows(database: Database, table: string, rows: SqlRow[], columns: string[]): void {
  const placeholders = columns.map(() => '?').join(', ')
  const statement = database.prepare(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
  )
  try {
    for (const row of rows) {
      const values: SqlValue[] = columns.map((column) => {
        const value = row[column]
        if (typeof value === 'boolean') return Number(value)
        if (value === undefined) return null
        return value
      })
      statement.run(values)
    }
  } finally {
    statement.free()
  }
}

function hydrateDatabase(database: Database, snapshot: CloudSnapshot): void {
  insertSnapshotRows(database, 'accounts', snapshot.accounts, [
    'id', 'name', 'type', 'institution', 'account_number', 'status', 'opening_date',
    'opening_balance_paise', 'created_at', 'updated_at',
  ])
  insertSnapshotRows(database, 'categories', snapshot.categories.map((row) => ({
    ...row,
    parent_category_id: null,
  })), ['id', 'name', 'parent_category_id', 'active'])
  for (const row of snapshot.categories) {
    const parentId = row.parent_category_id
    if (parentId !== null) {
      if (typeof parentId !== 'string') throw new Error('The server returned an invalid category parent.')
      database.run('UPDATE categories SET parent_category_id = ? WHERE id = ?', [
        parentId,
        readString(row, 'id'),
      ])
    }
  }
  insertSnapshotRows(database, 'transactions', snapshot.transactions, [
    'id', 'date', 'type', 'account_id', 'from_account_id', 'to_account_id', 'description',
    'amount_paise', 'category_id', 'notes', 'created_at', 'updated_at',
  ])
  insertSnapshotRows(database, 'fixed_deposits', snapshot.fixed_deposits, [
    'id', 'institution', 'account_number', 'principal_paise', 'start_date', 'maturity_date',
    'annual_rate_basis_points', 'interest_type', 'compounds_per_year', 'linked_account_id',
    'funding_account_id', 'maturity_instruction', 'status', 'closed_date', 'notes', 'created_at', 'updated_at',
  ])
  insertSnapshotRows(database, 'balance_snapshots', snapshot.balance_snapshots, [
    'id', 'account_id', 'date', 'reported_balance_paise', 'source', 'notes', 'created_at',
  ])
  insertSnapshotRows(database, 'transaction_changes', snapshot.transaction_changes, [
    'id', 'transaction_id', 'changed_at', 'reason', 'changed_fields_json',
  ])
  const violations = database.exec('PRAGMA foreign_key_check')
  if (violations.length > 0) throw new Error('Your finance data contains invalid references.')
}

function queryDatabaseRows(database: Database, sql: string): SqlRow[] {
  const statement = database.prepare(sql)
  try {
    const rows: SqlRow[] = []
    while (statement.step()) rows.push(statement.getAsObject())
    return rows
  } finally {
    statement.free()
  }
}

function getCloudChanges(previous: Database, current: Database): CloudChanges {
  return Object.fromEntries(snapshotTables.map((table) => {
    const before = queryDatabaseRows(previous, `SELECT * FROM ${table}`)
    const after = queryDatabaseRows(current, `SELECT * FROM ${table}`)
    const beforeById = new Map(before.map((row) => [readString(row, 'id'), row]))
    const afterById = new Map(after.map((row) => [readString(row, 'id'), row]))
    return [table, {
      upsert: after.filter((row) => {
        const oldRow = beforeById.get(readString(row, 'id'))
        return !oldRow || JSON.stringify(oldRow) !== JSON.stringify(row)
      }).map((row) => table === 'categories'
        ? { ...row, active: row.active === 1 }
        : row),
      delete: before
        .map((row) => readString(row, 'id'))
        .filter((id) => !afterById.has(id)),
    }]
  })) as CloudChanges
}

function getPragmaNumber(database: Database, pragma: string): number {
  const result = database.exec(`PRAGMA ${pragma}`)
  const value = result[0]?.values[0]?.[0]
  if (typeof value !== 'number') throw new Error(`Could not read SQLite ${pragma}.`)
  return value
}

function verifyDatabase(database: Database): void {
  const result = database.exec('PRAGMA integrity_check')
  const integrity = result[0]?.values[0]?.[0]
  if (integrity !== 'ok') throw new Error('The finance database failed its SQLite integrity check.')
  if (database.exec('PRAGMA foreign_key_check').length > 0) {
    throw new Error('The finance database contains invalid record references.')
  }
  if (getPragmaNumber(database, 'application_id') !== APPLICATION_ID) {
    throw new Error('This file is not a Personal Finance Tracker database.')
  }
  if (getPragmaNumber(database, 'user_version') !== CURRENT_SCHEMA_VERSION) {
    throw new Error('This backup uses an unsupported finance database schema version.')
  }
  const tables = new Set(
    database
      .exec("SELECT name FROM sqlite_master WHERE type = 'table'")
      .flatMap((table) => table.values.map((row) => row[0]))
      .filter((name): name is string => typeof name === 'string'),
  )
  for (const table of [
    'accounts',
    'categories',
    'transactions',
    'fixed_deposits',
    'balance_snapshots',
    'transaction_changes',
  ]) {
    if (!tables.has(table)) throw new Error(`The database is missing the required "${table}" table.`)
  }
}

export class FinanceDatabase {
  private static readonly openings = new Map<string, Promise<FinanceDatabase>>()
  private readonly sql: Awaited<ReturnType<typeof initSqlJs>>
  private readonly client: SupabaseClient
  private readonly userId: string
  private database: Database
  private cloudRevision: number
  private writeQueue: Promise<void> = Promise.resolve()
  private closed = false

  private constructor(
    sql: Awaited<ReturnType<typeof initSqlJs>>,
    database: Database,
    client: SupabaseClient,
    userId: string,
    cloudRevision: number,
  ) {
    this.sql = sql
    this.database = database
    this.client = client
    this.userId = userId
    this.cloudRevision = cloudRevision
  }

  static open(client: SupabaseClient, userId: string): Promise<FinanceDatabase> {
    const opening = this.openings.get(userId)
    if (opening) return opening

    const nextOpening = this.openFresh(client, userId).catch((error: unknown) => {
      if (this.openings.get(userId) === nextOpening) this.openings.delete(userId)
      throw error
    })
    this.openings.set(userId, nextOpening)
    return nextOpening
  }

  private static async openFresh(client: SupabaseClient, userId: string, retried = false): Promise<FinanceDatabase> {
    const { data, error } = await client.rpc('finance_load_snapshot')
    if (error) {
      const diagnostics = [error.code, error.details, error.hint].filter(Boolean).join(' ')
      const message = error.code === 'PGRST002'
        ? 'The data service cannot reach its database while loading. Check the project API and database status.'
        : error.message
      throw new Error(`Could not load your finance data: ${message}${diagnostics ? ` (${diagnostics})` : ''}`)
    }
    const snapshot = parseCloudSnapshot(data)

    const sql = await initSqlJs({ locateFile: () => wasmUrl })
    const database = new sql.Database()
    database.run('PRAGMA foreign_keys = ON')
    try {
      database.run(schema)
      hydrateDatabase(database, snapshot)
      verifyDatabase(database)
      if (getPragmaNumber(database, 'user_version') !== CURRENT_SCHEMA_VERSION) {
        throw new Error('The finance database schema is not supported by this app version.')
      }
      const financeDatabase = new FinanceDatabase(sql, database, client, userId, snapshot.revision)
      if (await financeDatabase.seedDefaults()) {
        const emptyDatabase = new sql.Database()
        emptyDatabase.run('PRAGMA foreign_keys = ON')
        emptyDatabase.run(schema)
        try {
          await financeDatabase.saveCloudChanges(emptyDatabase)
        } catch (error) {
          // Another tab set up this brand-new account first (for example the email-confirmation tab): use its data.
          if (!retried && error instanceof Error && error.message.includes('FINANCE_CONFLICT')) {
            database.close()
            return FinanceDatabase.openFresh(client, userId, true)
          }
          throw error
        } finally {
          emptyDatabase.close()
        }
      }
      return financeDatabase
    } catch (error) {
      database.close()
      throw error
    }
  }

  private rows(sql: string, params: SqlValue[] = []): SqlRow[] {
    const statement = this.database.prepare(sql, params)
    try {
      const rows: SqlRow[] = []
      while (statement.step()) rows.push(statement.getAsObject())
      return rows
    } finally {
      statement.free()
    }
  }

  private async seedDefaults(): Promise<boolean> {
    const now = currentTime()
    let changed = false
    const cashAccount = this.rows('SELECT id FROM accounts WHERE id = ?', ['CASH'])[0]
    if (!cashAccount) {
      this.database.run(
        `INSERT INTO accounts
          (id, name, type, institution, account_number, status, opening_date,
           opening_balance_paise, created_at, updated_at)
         VALUES (?, ?, 'cash', '', '', 'active', ?, 0, ?, ?)`,
        ['CASH', 'Cash on hand', now.slice(0, 10), now, now],
      )
      changed = true
    }

    const categoryCount = this.rows('SELECT COUNT(*) AS count FROM categories')[0]
    if (categoryCount && readInteger(categoryCount, 'count') === 0) {
      const statement = this.database.prepare(
        'INSERT INTO categories (id, name, parent_category_id, active) VALUES (?, ?, ?, 1)',
      )
      try {
        for (const [id, name, parentId] of defaultCategories) {
          statement.run([id, name, parentId])
        }
      } finally {
        statement.free()
      }
      changed = true
    }
    return changed
  }

  private async saveCloudChanges(previous: Database): Promise<void> {
    const changes = getCloudChanges(previous, this.database)
    const { data, error } = await this.client.rpc('finance_apply_changes', {
      expected_revision: this.cloudRevision,
      changes: { ...changes, client_api_version: CLIENT_API_VERSION },
    })
    if (error?.message.includes('FINANCE_OUTDATED')) throw new Error('This version of Ledgerly is out of date. Reload the page to update.')
    if (error) throw new Error(`Could not save your finance data: ${error.message}`)
    if (typeof data !== 'number' || !Number.isSafeInteger(data)) {
      throw new Error('The server returned an invalid finance revision after saving.')
    }
    this.cloudRevision = data
  }

  private enqueueWrite<T>(operation: () => T): Promise<T> {
    const task = this.writeQueue.then(async () => {
      const previousBytes = this.database.export()
      const previousDatabase = new this.sql.Database(previousBytes)
      this.database.run('BEGIN IMMEDIATE')
      let committed = false
      try {
        const result = operation()
        this.database.run('COMMIT')
        committed = true
        await this.saveCloudChanges(previousDatabase)
        return result
      } catch (error) {
        if (!committed) {
          try {
            this.database.run('ROLLBACK')
          } catch (rollbackError) {
            throw new AggregateError(
              [error, rollbackError],
              'The finance update failed and SQLite could not roll back the transaction.',
            )
          }
        } else {
          this.database.close()
          this.database = new this.sql.Database(previousBytes)
          this.database.run('PRAGMA foreign_keys = ON')
        }
        throw error
      } finally {
        previousDatabase.close()
      }
    })
    this.writeQueue = task.then(() => undefined, () => undefined)
    return task
  }

  private validateTransaction(input: TransactionInput): void {
    if (!isIsoDate(input.date)) throw new Error('Enter a valid transaction date.')
    if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0) {
      throw new Error('Amount must be greater than zero.')
    }
    if (!input.description.trim()) throw new Error('Description cannot be empty.')

    if (input.type === 'transfer') {
      if (!input.fromAccountId || !input.toAccountId || input.fromAccountId === input.toAccountId) {
        throw new Error('Choose two different accounts for a transfer.')
      }
      if (input.accountId !== null || input.categoryId !== null) {
        throw new Error('Transfers cannot have an expense category or single account.')
      }
    } else {
      if (!input.accountId || input.fromAccountId || input.toAccountId) {
        throw new Error('Choose an account for income or expense transactions.')
      }
    }
  }

  getAccounts(): Account[] {
    return this.rows(
      `SELECT a.*,
        a.opening_balance_paise - COALESCE((SELECT SUM(f.principal_paise) FROM fixed_deposits f WHERE f.funding_account_id = a.id), 0) + COALESCE((SELECT SUM(f.principal_paise) FROM fixed_deposits f WHERE f.status = 'closed' AND f.funding_account_id IS NOT NULL AND COALESCE(f.linked_account_id, f.funding_account_id) = a.id), 0) + COALESCE(SUM(
          CASE
            WHEN t.type = 'income' AND t.account_id = a.id THEN t.amount_paise
            WHEN t.type = 'expense' AND t.account_id = a.id THEN -t.amount_paise
            WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN t.amount_paise
            WHEN t.type = 'transfer' AND t.from_account_id = a.id THEN -t.amount_paise
            ELSE 0
          END
        ), 0) AS current_balance_paise
       FROM accounts a
       LEFT JOIN transactions t
         ON t.account_id = a.id OR t.from_account_id = a.id OR t.to_account_id = a.id
       GROUP BY a.id
       ORDER BY CASE WHEN a.id = 'CASH' THEN 0 ELSE 1 END, a.name`,
    ).map(readAccount)
  }

  getCategories(): Category[] {
    return this.rows(
      'SELECT id, name, parent_category_id, active FROM categories ORDER BY name',
    ).map(readCategory)
  }

  /** Transactions dated from `startDate` to `endDate` inclusive (ISO dates), newest first. */
  getTransactions(startDate: string, endDate: string, search = ''): Transaction[] {
    const normalizedSearch = search.trim()
    const params: SqlValue[] = [startDate, endDate]
    let searchClause = ''
    if (normalizedSearch) {
      searchClause = ' AND (description LIKE ? OR notes LIKE ?)'
      const query = `%${normalizedSearch}%`
      params.push(query, query)
    }
    return this.rows(
      `SELECT * FROM transactions
       WHERE date BETWEEN ? AND ?${searchClause}
       ORDER BY date DESC, created_at DESC
       `,
      params,
    ).map(readTransaction)
  }

  getAllTransactions(): Transaction[] {
    return this.rows('SELECT * FROM transactions ORDER BY date DESC, created_at DESC').map(readTransaction)
  }

  getRecentTransactions(limit: number): Transaction[] {
    return this.rows('SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT ?', [limit]).map(readTransaction)
  }

  getExpenseReportTransactions(
    startDate: string,
    endDate: string,
    categoryIds: string[] | null,
  ): Transaction[] {
    if (!isIsoDate(startDate) || !isIsoDate(endDate) || startDate > endDate) {
      throw new Error('Choose a valid report period with the start date on or before the end date.')
    }

    const params: SqlValue[] = [startDate, endDate]
    let categoryClause = ''
    if (categoryIds !== null) {
      if (categoryIds.length === 0) {
        categoryClause = ' AND category_id IS NULL'
      } else {
        categoryClause = ` AND category_id IN (${categoryIds.map(() => '?').join(', ')})`
        params.push(...categoryIds)
      }
    }

    return this.rows(
      `SELECT * FROM transactions
       WHERE type = 'expense' AND date BETWEEN ? AND ?${categoryClause}
       ORDER BY date DESC, created_at DESC`,
      params,
    ).map(readTransaction)
  }

  getFixedDeposits(): FixedDeposit[] {
    return this.rows(
      `SELECT * FROM fixed_deposits
       ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'matured' THEN 1 ELSE 2 END,
         maturity_date`,
    ).map(readFixedDeposit)
  }

  getBalanceSnapshots(): BalanceSnapshot[] {
    return this.rows(
      `SELECT s.*,
        a.opening_balance_paise - COALESCE((
          SELECT SUM(f.principal_paise) FROM fixed_deposits f
          WHERE f.funding_account_id = s.account_id AND f.start_date <= s.date
        ), 0) + COALESCE((
          SELECT SUM(f.principal_paise) FROM fixed_deposits f
          WHERE f.status = 'closed' AND f.funding_account_id IS NOT NULL
            AND COALESCE(f.linked_account_id, f.funding_account_id) = s.account_id
            AND COALESCE(f.closed_date, substr(f.updated_at, 1, 10)) <= s.date
        ), 0) + COALESCE((
          SELECT SUM(
            CASE
              WHEN t.type = 'income' AND t.account_id = s.account_id THEN t.amount_paise
              WHEN t.type = 'expense' AND t.account_id = s.account_id THEN -t.amount_paise
              WHEN t.type = 'transfer' AND t.to_account_id = s.account_id THEN t.amount_paise
              WHEN t.type = 'transfer' AND t.from_account_id = s.account_id THEN -t.amount_paise
              ELSE 0
            END
          )
          FROM transactions t
          WHERE t.date <= s.date
            AND (t.account_id = s.account_id
              OR t.from_account_id = s.account_id
              OR t.to_account_id = s.account_id)
        ), 0) AS calculated_balance_paise
       FROM balance_snapshots s
       JOIN accounts a ON a.id = s.account_id
       ORDER BY s.date DESC, s.created_at DESC`,
    ).map(readBalanceSnapshot)
  }

  /** Totals for transactions dated from `startDate` to `endDate` inclusive (ISO dates). */
  getPeriodSummary(startDate: string, endDate: string): YearSummary {
    const rows = this.rows(
      `SELECT type, category_id, SUM(amount_paise) AS amount_paise, COUNT(*) AS count
       FROM transactions
       WHERE date BETWEEN ? AND ?
       GROUP BY type, category_id`,
      [startDate, endDate],
    )
    const summary: YearSummary = {
      incomePaise: 0,
      expensePaise: 0,
      transferPaise: 0,
      transactionCount: 0,
      expensesByCategory: [],
    }
    for (const row of rows) {
      const type = readString(row, 'type')
      const amount = readInteger(row, 'amount_paise')
      const count = readInteger(row, 'count')
      summary.transactionCount += count
      if (type === 'income') summary.incomePaise += amount
      if (type === 'expense') {
        summary.expensePaise += amount
        summary.expensesByCategory.push({
          categoryId: readNullableString(row, 'category_id'),
          amountPaise: amount,
        })
      }
      if (type === 'transfer') summary.transferPaise += amount
    }
    return summary
  }

  async saveAccount(input: {
    id?: string
    name: string
    institution: string
    accountNumber: string
    openingDate: string
    openingBalancePaise: number
  }): Promise<string> {
    const name = input.name.trim()
    const institution = input.institution.trim()
    const accountNumber = input.accountNumber.trim()
    if (!name || !institution || !accountNumber) {
      throw new Error('Account name, institution, and account number are required.')
    }
    if (!isIsoDate(input.openingDate)) throw new Error('Enter a valid opening date.')
    if (!Number.isSafeInteger(input.openingBalancePaise) || input.openingBalancePaise < 0) {
      throw new Error('Opening balance cannot be negative.')
    }
    const id = input.id ?? newId()
    const now = currentTime()

    return this.enqueueWrite(() => {
      if (input.id) {
        const changed = this.database.run(
          `UPDATE accounts SET name = ?, institution = ?, account_number = ?,
            opening_date = ?, opening_balance_paise = ?, updated_at = ?
           WHERE id = ? AND type = 'savings'`,
          [name, institution, accountNumber, input.openingDate, input.openingBalancePaise, now, id],
        ).getRowsModified()
        if (changed !== 1) throw new Error('Savings account was not found.')
      } else {
        this.database.run(
          `INSERT INTO accounts
            (id, name, type, institution, account_number, status, opening_date,
             opening_balance_paise, created_at, updated_at)
           VALUES (?, ?, 'savings', ?, ?, 'active', ?, ?, ?, ?)`,
          [id, name, institution, accountNumber, input.openingDate, input.openingBalancePaise, now, now],
        )
      }
      return id
    })
  }

  async saveCategory(input: {
    id?: string
    name: string
    parentCategoryId: string | null
  }): Promise<string> {
    const name = input.name.trim()
    if (!name) throw new Error('Category name cannot be empty.')
    const id = input.id ?? newId()

    return this.enqueueWrite(() => {
      if (input.id) {
        let parentId = input.parentCategoryId
        while (parentId) {
          if (parentId === id) throw new Error('A category cannot be its own descendant.')
          const parent = this.rows('SELECT parent_category_id FROM categories WHERE id = ?', [parentId])[0]
          parentId = parent ? readNullableString(parent, 'parent_category_id') : null
        }
        const changed = this.database.run(
          `UPDATE categories SET name = ?, parent_category_id = ? WHERE id = ?`,
          [name, input.parentCategoryId, id],
        ).getRowsModified()
        if (changed !== 1) throw new Error('Category was not found.')
      } else {
        this.database.run(
          `INSERT INTO categories (id, name, parent_category_id, active) VALUES (?, ?, ?, 1)`,
          [id, name, input.parentCategoryId],
        )
      }
      return id
    })
  }

  async setCategoryActive(id: string, active: boolean): Promise<void> {
    await this.enqueueWrite(() => {
      const changed = this.database.run(
        'UPDATE categories SET active = ? WHERE id = ?',
        [active ? 1 : 0, id],
      ).getRowsModified()
      if (changed !== 1) throw new Error('Category was not found.')
    })
  }

  async saveTransaction(input: TransactionInput, reason = ''): Promise<string> {
    this.validateTransaction(input)
    const id = input.id ?? newId()
    const now = currentTime()
    const normalizedInput = {
      ...input,
      description: input.description.trim(),
      notes: input.notes.trim(),
    }

    return this.enqueueWrite(() => {
      if (input.id) {
        const previous = this.rows('SELECT * FROM transactions WHERE id = ?', [id])[0]
        if (!previous) throw new Error('Transaction was not found.')
        const previousTransaction = readTransaction(previous)
        this.database.run(
          `UPDATE transactions SET date = ?, type = ?, account_id = ?,
            from_account_id = ?, to_account_id = ?, description = ?,
            amount_paise = ?, category_id = ?, notes = ?, updated_at = ?
           WHERE id = ?`,
          [
            normalizedInput.date,
            normalizedInput.type,
            normalizedInput.accountId,
            normalizedInput.fromAccountId,
            normalizedInput.toAccountId,
            normalizedInput.description,
            normalizedInput.amountPaise,
            normalizedInput.categoryId,
            normalizedInput.notes,
            now,
            id,
          ],
        )
        const current = { ...normalizedInput, id }
        const changedFields: Record<string, { before: unknown; after: unknown }> = {}
        for (const key of [
          'date',
          'type',
          'accountId',
          'fromAccountId',
          'toAccountId',
          'description',
          'amountPaise',
          'categoryId',
          'notes',
        ] as const) {
          if (previousTransaction[key] !== current[key]) {
            changedFields[key] = { before: previousTransaction[key], after: current[key] }
          }
        }
        if (Object.keys(changedFields).length > 0) {
          this.database.run(
            `INSERT INTO transaction_changes (id, transaction_id, changed_at, reason, changed_fields_json)
             VALUES (?, ?, ?, ?, ?)`,
            [newId(), id, now, reason.trim(), JSON.stringify(changedFields)],
          )
        }
      } else {
        this.database.run(
          `INSERT INTO transactions
            (id, date, type, account_id, from_account_id, to_account_id, description,
             amount_paise, category_id, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            normalizedInput.date,
            normalizedInput.type,
            normalizedInput.accountId,
            normalizedInput.fromAccountId,
            normalizedInput.toAccountId,
            normalizedInput.description,
            normalizedInput.amountPaise,
            normalizedInput.categoryId,
            normalizedInput.notes,
            now,
            now,
          ],
        )
      }
      return id
    })
  }

  async saveFixedDeposit(input: FixedDepositInput): Promise<string> {
    const institution = input.institution.trim()
    const accountNumber = input.accountNumber.trim()
    if (!institution || !accountNumber) {
      throw new Error('Institution and FD account/reference number are required.')
    }
    if (!isIsoDate(input.startDate) || !isIsoDate(input.maturityDate) || input.maturityDate < input.startDate) {
      throw new Error('Enter valid FD dates; maturity cannot be before the start date.')
    }
    if (!Number.isSafeInteger(input.principalPaise) || input.principalPaise <= 0) {
      throw new Error('FD principal must be greater than zero.')
    }
    if (!Number.isSafeInteger(input.annualRateBasisPoints) || input.annualRateBasisPoints < 0) {
      throw new Error('Enter a valid annual interest rate.')
    }
    if (!Number.isSafeInteger(input.compoundsPerYear) || input.compoundsPerYear < 1 || input.compoundsPerYear > 365) {
      throw new Error('Compounding periods per year must be from 1 to 365.')
    }
    const id = input.id ?? newId()
    const now = currentTime()

    return this.enqueueWrite(() => {
      if (input.fundingAccountId) {
        const funding = this.rows('SELECT type, status FROM accounts WHERE id = ?', [input.fundingAccountId])[0]
        if (!funding || readString(funding, 'type') !== 'savings' || readString(funding, 'status') !== 'active') {
          throw new Error('Choose an active savings account to fund this deposit.')
        }
      } else if (!input.id) {
        throw new Error('Choose the savings account this deposit is funded from.')
      }
      const existing = input.id
        ? this.rows('SELECT created_at FROM fixed_deposits WHERE id = ?', [id])[0]
        : undefined
      if (input.id && !existing) throw new Error('Fixed deposit was not found.')
      const createdAt = existing ? readString(existing, 'created_at') : now
      this.database.run(
        `INSERT INTO fixed_deposits
          (id, institution, account_number, principal_paise, start_date, maturity_date,
           annual_rate_basis_points, interest_type, compounds_per_year, linked_account_id,
           funding_account_id, maturity_instruction, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           institution = excluded.institution,
           account_number = excluded.account_number,
           principal_paise = excluded.principal_paise,
           start_date = excluded.start_date,
           maturity_date = excluded.maturity_date,
           annual_rate_basis_points = excluded.annual_rate_basis_points,
           interest_type = excluded.interest_type,
           compounds_per_year = excluded.compounds_per_year,
           linked_account_id = excluded.linked_account_id,
           funding_account_id = excluded.funding_account_id,
           maturity_instruction = excluded.maturity_instruction,
           notes = excluded.notes,
           updated_at = excluded.updated_at`,
        [
          id,
          institution,
          accountNumber,
          input.principalPaise,
          input.startDate,
          input.maturityDate,
          input.annualRateBasisPoints,
          input.interestType,
          input.compoundsPerYear,
          input.linkedAccountId,
          input.fundingAccountId,
          input.maturityInstruction.trim(),
          input.notes.trim(),
          createdAt,
          now,
        ],
      )
      // shortcut: balance is checked as of today, not the FD start date; upgrade if backdated FDs matter.
      const funding = input.fundingAccountId && this.getAccounts().find((account) => account.id === input.fundingAccountId)
      if (funding && funding.currentBalancePaise < 0) {
        throw new Error(`Not enough balance in ${accountLabel(funding)} to fund this deposit.`)
      }
      return id
    })
  }

  /**
   * Closes a deposit. Its principal goes back to `accountId` (the balance rule counts it once the deposit is
   * closed) and any interest is recorded as income in that account on the closing date.
   */
  async closeFixedDeposit(id: string, input: { date: string; accountId: string; interestPaise: number }): Promise<void> {
    if (!isIsoDate(input.date)) throw new Error('Enter a valid closing date.')
    if (!Number.isSafeInteger(input.interestPaise) || input.interestPaise < 0) throw new Error('Interest cannot be negative.')

    await this.enqueueWrite(() => {
      const deposit = this.rows('SELECT institution, account_number, start_date, status FROM fixed_deposits WHERE id = ?', [id])[0]
      if (!deposit || readString(deposit, 'status') === 'closed') throw new Error('Active fixed deposit was not found.')
      if (input.date < readString(deposit, 'start_date')) throw new Error('A deposit cannot close before it started.')
      const account = this.rows('SELECT type, status FROM accounts WHERE id = ?', [input.accountId])[0]
      if (!account || readString(account, 'type') !== 'savings' || readString(account, 'status') !== 'active') {
        throw new Error('Choose an active savings account to receive the money.')
      }

      const now = currentTime()
      this.database.run(
        `UPDATE fixed_deposits SET status = 'closed', closed_date = ?, linked_account_id = ?, updated_at = ? WHERE id = ?`,
        [input.date, input.accountId, now, id],
      )
      if (input.interestPaise > 0) {
        this.database.run(
          `INSERT INTO transactions
            (id, date, type, account_id, from_account_id, to_account_id, description,
             amount_paise, category_id, notes, created_at, updated_at)
           VALUES (?, ?, 'income', ?, NULL, NULL, ?, ?, NULL, '', ?, ?)`,
          [newId(), input.date, input.accountId, `Interest on FD ${readString(deposit, 'institution')} ${maskAccountNumber(readString(deposit, 'account_number'))}`, input.interestPaise, now, now],
        )
      }
    })
  }

  async saveBalanceSnapshot(input: BalanceSnapshotInput): Promise<string> {
    if (!isIsoDate(input.date)) throw new Error('Enter a valid snapshot date.')
    if (!Number.isSafeInteger(input.reportedBalancePaise) || input.reportedBalancePaise < 0) {
      throw new Error('Reported balance cannot be negative.')
    }
    const source = input.source.trim()
    if (!source) throw new Error('Enter where this balance came from.')
    const id = newId()

    return this.enqueueWrite(() => {
      this.database.run(
        `INSERT INTO balance_snapshots
          (id, account_id, date, reported_balance_paise, source, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.accountId,
          input.date,
          input.reportedBalancePaise,
          source,
          input.notes.trim(),
          currentTime(),
        ],
      )
      return id
    })
  }

  async importTransactions(rows: ImportedTransaction[]): Promise<{ imported: number; duplicates: number }> {
    const accounts = new Set(this.getAccounts().map((account) => account.id))
    const categories = new Set(this.getCategories().map((category) => category.id))
    const seen = new Set<string>()
    const newRows: ImportedTransaction[] = []
    let duplicates = 0

    for (const row of rows) {
      if (seen.has(row.transaction.id) || this.rows('SELECT id FROM transactions WHERE id = ?', [row.transaction.id]).length > 0) {
        duplicates += 1
        seen.add(row.transaction.id)
        continue
      }
      if (row.transaction.accountId && !accounts.has(row.transaction.accountId)) {
        throw new Error(`CSV row ${row.rowNumber}: account ${row.transaction.accountId} is missing.`)
      }
      if (row.transaction.fromAccountId && !accounts.has(row.transaction.fromAccountId)) {
        throw new Error(`CSV row ${row.rowNumber}: source account is missing.`)
      }
      if (row.transaction.toAccountId && !accounts.has(row.transaction.toAccountId)) {
        throw new Error(`CSV row ${row.rowNumber}: destination account is missing.`)
      }
      if (row.transaction.categoryId && !categories.has(row.transaction.categoryId)) {
        throw new Error(`CSV row ${row.rowNumber}: category is missing.`)
      }
      this.validateTransaction(row.transaction)
      newRows.push(row)
      seen.add(row.transaction.id)
    }

    await this.enqueueWrite(() => {
      const now = currentTime()
      const statement = this.database.prepare(
        `INSERT INTO transactions
          (id, date, type, account_id, from_account_id, to_account_id, description,
           amount_paise, category_id, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      try {
        for (const { transaction } of newRows) {
          statement.run([
            transaction.id,
            transaction.date,
            transaction.type,
            transaction.accountId,
            transaction.fromAccountId,
            transaction.toAccountId,
            transaction.description.trim(),
            transaction.amountPaise,
            transaction.categoryId,
            transaction.notes.trim(),
            now,
            now,
          ])
        }
      } finally {
        statement.free()
      }
      return undefined
    })

    return { imported: newRows.length, duplicates }
  }

  async getBackupBytes(): Promise<Uint8Array> {
    await this.writeQueue
    return this.database.export()
  }

  async restoreBackupBytes(bytes: Uint8Array): Promise<void> {
    await this.writeQueue
    let restored: Database | undefined
    try {
      restored = new this.sql.Database(bytes)
      restored.run('PRAGMA foreign_keys = ON')
      // Backups made before these columns existed lack them.
      const depositColumns = restored.exec('PRAGMA table_info(fixed_deposits)')[0]?.values.map((column) => column[1]) ?? []
      if (!depositColumns.includes('funding_account_id')) {
        restored.run('ALTER TABLE fixed_deposits ADD COLUMN funding_account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT')
      }
      if (!depositColumns.includes('closed_date')) restored.run('ALTER TABLE fixed_deposits ADD COLUMN closed_date TEXT')
      verifyDatabase(restored)
    } catch (error) {
      restored?.close()
      throw new Error(
        error instanceof Error ? `Backup validation failed: ${error.message}` : 'Backup validation failed.',
      )
    }

    const previous = this.database
    this.database = restored
    try {
      const previousDatabase = new this.sql.Database(previous.export())
      try {
        await this.saveCloudChanges(previousDatabase)
      } finally {
        previousDatabase.close()
      }
      previous.close()
    } catch (error) {
      this.database = previous
      restored.close()
      throw error
    }
  }

  /** Permanently deletes the signed-in user's account and all finance data, then closes this database. */
  async deleteAccount(): Promise<void> {
    await this.writeQueue
    const { error } = await this.client.rpc('finance_delete_account')
    if (error) throw new Error(`Could not delete your account: ${error.message}`)
    await this.close()
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    FinanceDatabase.openings.delete(this.userId)
    await this.writeQueue
    this.database.close()
  }
}
