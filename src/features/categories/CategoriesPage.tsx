import { useState, type CSSProperties } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { categoryPath, type Category } from '../../domain/models'
import { useFinance } from '../../app/finance-context'
import type { FinanceDatabase } from '../../data/finance-database'
import { CategoryForm } from './CategoryForm'

export function CategoriesPage() {
  const { database, categories, runAction } = useFinance()
  const [categoryForm, setCategoryForm] = useState<Category | null | undefined>(undefined)

  async function createCategory(value: Parameters<FinanceDatabase['saveCategory']>[0]) {
    await runAction(() => database.saveCategory(value), value.id ? 'Category updated.' : 'Category added.')
    setCategoryForm(undefined)
  }

  return (
            <>
              <section className="page-heading"><div><p className="eyebrow">MAKE SENSE OF SPENDING</p><h2>Categories</h2><p className="page-subtitle">Organize expenses into a hierarchy that works for you.</p></div><button className="button button-primary" onClick={() => setCategoryForm(null)}><Plus size={16} /> Add category</button></section>
              {categoryForm !== undefined && <CategoryForm key={categoryForm?.id ?? 'new-category'} categories={categories} category={categoryForm} onCancel={() => setCategoryForm(undefined)} onSave={createCategory} />}
              <section className="panel category-panel">
                {categories.map((category) => <div className={`category-row ${!category.active ? 'inactive-category' : ''}`} key={category.id}>
                  <span className="category-indent" style={{ '--depth': categoryPath(category.id, categories).split(' > ').length - 1 } as CSSProperties}><span /></span>
                  <span className="category-name">{category.name}<small>{categoryPath(category.id, categories)}</small></span>
                  <span className={`status-pill ${category.active ? 'status-active' : 'status-closed'}`}>{category.active ? 'Active' : 'Archived'}</span>
                  <button className="icon-button" aria-label={`Edit ${category.name}`} onClick={() => setCategoryForm(category)}><Pencil size={15} /></button>
                  <button className="text-button" onClick={() => void runAction(() => database.setCategoryActive(category.id, !category.active), category.active ? 'Category archived.' : 'Category reactivated.').catch(() => undefined)}>{category.active ? 'Archive' : 'Restore'}</button>
                </div>)}
              </section>
            </>
  )
}
