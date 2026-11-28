import Papa from 'papaparse'
import {
  isIsoDate,
  parseRupeesToPaise,
  type ImportedTransaction,
  type Transaction,
  type TransactionType,
} from '../domain/models'

export const TRANSACTION_CSV_HEADERS = [
  'transaction_id',
  'date',
  'type',
  'account_id',
  'from_account_id',
  'to_account_id',
  'description',
  'amount',
  'category_id',
  'notes',
  'created_at',
  'updated_at',
] as const

export interface CsvImportResult {
  validRows: ImportedTransaction[]
  errors: string[]
}

function amountAsDecimal(amountPaise: number): string {
  return (amountPaise / 100).toFixed(2)
}

export function exportTransactionsCsv(transactions: Transaction[]): string {
  const rows = transactions.map((transaction) => ({
    transaction_id: transaction.id,
    date: transaction.date,
    type: transaction.type,
    account_id: transaction.accountId ?? '',
    from_account_id: transaction.fromAccountId ?? '',
    to_account_id: transaction.toAccountId ?? '',
    description: transaction.description,
    amount: amountAsDecimal(transaction.amountPaise),
    category_id: transaction.categoryId ?? '',
    notes: transaction.notes,
    created_at: transaction.createdAt,
    updated_at: transaction.updatedAt,
  }))

  return `\uFEFF${Papa.unparse(
    { fields: [...TRANSACTION_CSV_HEADERS], data: rows },
    // escapeFormulae prefixes cells starting with = + - @ with a quote so Excel shows them as text instead of running them
    { newline: '\r\n', escapeFormulae: true },
  )}`
}

/** Undoes the quote that the export adds in front of cells that would otherwise look like formulas. */
function unescapeFormula(value: string | undefined): string | undefined {
  return value?.replace(/^'(?=[=+\-@\t\r])/, '')
}

export function parseTransactionsCsv(
  csv: string,
  knownAccountIds: Set<string>,
  knownCategoryIds: Set<string>,
): CsvImportResult {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().replace(/^\uFEFF/, ''),
  })

  const errors = parsed.errors.map(
    (error) => `CSV row ${error.row === undefined ? '?' : error.row + 2}: ${error.message}`,
  )
  const requiredHeaders = [
    'transaction_id',
    'date',
    'type',
    'account_id',
    'description',
    'amount',
    'category_id',
    'notes',
  ]
  const headers = parsed.meta.fields ?? []
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) errors.push(`Missing required CSV column: ${header}`)
  }
  if (errors.length > 0) return { validRows: [], errors }

  const validRows: ImportedTransaction[] = []
  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2
    const issue = (message: string) => errors.push(`CSV row ${rowNumber}: ${message}`)
    const id = row.transaction_id?.trim()
    const date = row.date?.trim()
    const type = row.type?.trim() as TransactionType | undefined
    const description = unescapeFormula(row.description)?.trim()
    const accountId = row.account_id?.trim() || null
    const fromAccountId = row.from_account_id?.trim() || null
    const toAccountId = row.to_account_id?.trim() || null
    const categoryId = row.category_id?.trim() || null
    const notes = unescapeFormula(row.notes)?.trim() ?? ''

    if (!id) {
      issue('transaction_id cannot be empty.')
      return
    }
    if (!date || !isIsoDate(date)) {
      issue('date must be a valid YYYY-MM-DD date.')
      return
    }
    if (type !== 'expense' && type !== 'income' && type !== 'transfer') {
      issue('type must be expense, income, or transfer.')
      return
    }
    if (!description) {
      issue('description cannot be empty.')
      return
    }

    let amountPaise: number
    try {
      amountPaise = parseRupeesToPaise(row.amount ?? '')
    } catch (error) {
      issue(error instanceof Error ? error.message : 'amount is invalid.')
      return
    }

    if (categoryId && !knownCategoryIds.has(categoryId)) {
      issue(`category_id "${categoryId}" does not exist in this database.`)
      return
    }

    if (type === 'transfer') {
      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
        issue('transfers require different from_account_id and to_account_id values.')
        return
      }
      if (!knownAccountIds.has(fromAccountId) || !knownAccountIds.has(toAccountId)) {
        issue('transfer account IDs must exist in this database.')
        return
      }
      if (categoryId) {
        issue('transfers cannot have an expense category.')
        return
      }
    } else {
      if (!accountId || !knownAccountIds.has(accountId)) {
        issue('account_id must refer to an account in this database.')
        return
      }
      if (fromAccountId || toAccountId) {
        issue('from_account_id and to_account_id are only valid for transfers.')
        return
      }
    }

    validRows.push({
      rowNumber,
      transaction: {
        id,
        date,
        type,
        accountId: type === 'transfer' ? null : accountId,
        fromAccountId: type === 'transfer' ? fromAccountId : null,
        toAccountId: type === 'transfer' ? toAccountId : null,
        description,
        amountPaise,
        categoryId: type === 'transfer' ? null : categoryId,
        notes,
      },
    })
  })

  return { validRows, errors }
}
