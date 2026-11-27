import { categoryPath, type Category, type Transaction } from './models'

export interface ExpenseReportSummary {
  totalPaise: number
  transactionCount: number
  categoryBreakdown: Array<{
    categoryId: string | null
    categoryPath: string
    amountPaise: number
    transactionCount: number
  }>
  monthlyBreakdown: Array<{
    month: string
    amountPaise: number
    transactionCount: number
  }>
}

export function summarizeExpenseReport(
  transactions: Transaction[],
  categories: Category[],
): ExpenseReportSummary {
  const categoriesById = new Map<string | null, ExpenseReportSummary['categoryBreakdown'][number]>()
  const monthsById = new Map<string, ExpenseReportSummary['monthlyBreakdown'][number]>()
  let totalPaise = 0
  let transactionCount = 0

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue
    totalPaise += transaction.amountPaise
    transactionCount += 1
    if (!Number.isSafeInteger(totalPaise)) {
      throw new Error('The report total exceeds the supported amount range.')
    }

    const category = categoriesById.get(transaction.categoryId) ?? {
      categoryId: transaction.categoryId,
      categoryPath: categoryPath(transaction.categoryId, categories),
      amountPaise: 0,
      transactionCount: 0,
    }
    category.amountPaise += transaction.amountPaise
    category.transactionCount += 1
    categoriesById.set(transaction.categoryId, category)

    const monthId = transaction.date.slice(0, 7)
    const month = monthsById.get(monthId) ?? {
      month: monthId,
      amountPaise: 0,
      transactionCount: 0,
    }
    month.amountPaise += transaction.amountPaise
    month.transactionCount += 1
    monthsById.set(monthId, month)
  }

  return {
    totalPaise,
    transactionCount,
    categoryBreakdown: [...categoriesById.values()].sort((left, right) => right.amountPaise - left.amountPaise),
    monthlyBreakdown: [...monthsById.values()].sort((left, right) => left.month.localeCompare(right.month)),
  }
}
