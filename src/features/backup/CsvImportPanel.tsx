import { useState } from 'react'
import { ArrowLeftRight, FileUp } from 'lucide-react'
import { type ImportedTransaction } from '../../domain/models'
import { useFinance } from '../../app/finance-context'
import { parseTransactionsCsv } from '../../data/transactions-csv'

export function CsvImportPanel() {
  const { database, accounts, categories, refresh, clearNotice, showSuccess, showError } = useFinance()
  const [csvPreview, setCsvPreview] = useState<{ fileName: string; rows: ImportedTransaction[]; errors: string[] } | null>(null)
  const [importing, setImporting] = useState(false)

  async function selectCsv(file: File | undefined) {
    if (!file) return
    try {
      const result = parseTransactionsCsv(await file.text(), new Set(accounts.map((account) => account.id)), new Set(categories.map((category) => category.id)))
      setCsvPreview({ fileName: file.name, rows: result.validRows, errors: result.errors })
      clearNotice()
    } catch (error) {
      showError(error)
    }
  }

  async function importCsv() {
    if (!csvPreview || csvPreview.errors.length > 0) return
    setImporting(true)
    try {
      const result = await database.importTransactions(csvPreview.rows)
      refresh()
      setCsvPreview(null)
      showSuccess(`Imported ${result.imported} transaction${result.imported === 1 ? '' : 's'}; skipped ${result.duplicates} duplicate${result.duplicates === 1 ? '' : 's'}.`)
    } catch (error) {
      showError(error)
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="panel csv-import-panel">
      <div className="backup-icon csv"><ArrowLeftRight size={20} /></div><p className="eyebrow">ONE-TIME HISTORICAL IMPORT</p><h2>Import transactions from CSV</h2><p>Choose an annual CSV export in this app's format. Review validation before importing; existing transaction IDs are skipped.</p>
      <label className="file-drop"><FileUp size={20} /><span><b>Select a CSV file</b><small>CSV is read in your browser and saved to Supabase.</small></span><input type="file" accept=".csv,text/csv" onChange={(event) => void selectCsv(event.target.files?.[0])} /></label>
      {csvPreview && <div className="csv-preview">
        <div className="preview-heading"><b>{csvPreview.fileName}</b><span>{csvPreview.rows.length} valid row{csvPreview.rows.length === 1 ? '' : 's'}</span></div>
        {csvPreview.errors.length > 0 && <ul className="csv-errors">{csvPreview.errors.slice(0, 12).map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul>}
        {csvPreview.errors.length > 12 && <p className="field-hint">And {csvPreview.errors.length - 12} more issues.</p>}
        {csvPreview.errors.length === 0 && <p className="field-hint">Ready to import. Existing IDs will be skipped; duplicate rows in this file are counted once.</p>}
        <button className="button button-primary" disabled={importing || csvPreview.errors.length > 0 || csvPreview.rows.length === 0} onClick={() => void importCsv()}><FileUp size={15} /> {importing ? 'Importing…' : 'Import valid rows'}</button>
      </div>}
    </section>
  )
}
