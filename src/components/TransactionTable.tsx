import { Pencil } from 'lucide-react'
import { accountLabel, categoryPath, formatRupees, type Account, type Category, type Transaction } from '../domain/models'

export function TransactionTable({
  transactions,
  accounts,
  categories,
  onEdit,
  compact = false,
}: {
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  onEdit: (transaction: Transaction) => void
  compact?: boolean
}) {
  const accountNames = new Map(accounts.map((account) => [account.id, accountLabel(account)]))
  return (
    <div className={`table-wrap ${compact ? 'compact-table' : ''}`}>
      <table className="data-table">
        <thead><tr><th>Date</th><th>Description</th><th>Category / account</th><th>Type</th><th className="align-right">Amount</th><th aria-label="Actions" /></tr></thead>
        <tbody>{transactions.map((transaction) => {
          const accountText = transaction.type === 'transfer'
            ? `${accountNames.get(transaction.fromAccountId ?? '') ?? 'Unknown'} → ${accountNames.get(transaction.toAccountId ?? '') ?? 'Unknown'}`
            : accountNames.get(transaction.accountId ?? '') ?? 'Unknown account'
          return <tr key={transaction.id}>
            <td className="date-cell">{transaction.date}</td>
            <td><b>{transaction.description}</b>{transaction.notes && <small className="table-note">{transaction.notes}</small>}</td>
            <td><span className="category-cell">{transaction.type === 'transfer' ? accountText : categoryPath(transaction.categoryId, categories)}</span><small className="table-note">{transaction.type === 'transfer' ? 'Account transfer' : accountText}</small></td>
            <td><span className={`transaction-type ${transaction.type}`}>{transaction.type}</span></td>
            <td className={`amount-cell align-right ${transaction.type === 'income' ? 'income-amount' : transaction.type === 'expense' ? 'expense-amount' : ''}`}>{transaction.type === 'expense' ? '−' : transaction.type === 'income' ? '+' : ''}{formatRupees(transaction.amountPaise)}</td>
            <td><button className="icon-button" aria-label={`Edit ${transaction.description}`} onClick={() => onEdit(transaction)}><Pencil size={15} /></button></td>
          </tr>
        })}</tbody>
      </table>
    </div>
  )
}
