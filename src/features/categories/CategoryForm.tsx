import { useState, type FormEvent } from 'react'
import { categoryPath, type Category } from '../../domain/models'
import { ComboBox } from '../../components/ComboBox'

export function CategoryForm({
  categories,
  category,
  onCancel,
  onSave,
}: {
  categories: Category[]
  category: Category | null
  onCancel: () => void
  onSave: (value: { id?: string; name: string; parentCategoryId: string | null }) => Promise<void>
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [parentCategoryId, setParentCategoryId] = useState(category?.parentCategoryId ?? '')
  const [formError, setFormError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    try {
      await onSave({ ...(category ? { id: category.id } : {}), name, parentCategoryId: parentCategoryId || null })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this category.')
    }
  }

  return (
    <form className="form-card compact-form" onSubmit={submit}>
      <div className="form-heading">
        <div><p className="eyebrow">Multi-level categories</p><h2>{category ? 'Edit category' : 'Add category'}</h2></div>
        <button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button>
      </div>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="form-grid">
        <label>Category name<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <ComboBox label="Parent category" options={[{ id: '', label: 'Top level' }, ...categories.filter((item) => item.id !== category?.id).map((item) => ({ id: item.id, label: categoryPath(item.id, categories) })).sort((first, second) => first.label.localeCompare(second.label))]} value={parentCategoryId} onChange={setParentCategoryId} placeholder="Search categories" />
      </div>
      <div className="form-actions"><button className="button button-primary" type="submit">Save category</button></div>
    </form>
  )
}
