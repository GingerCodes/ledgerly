// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account, Category, Transaction } from '../../domain/models'
import { shiftIsoDate, todayIso } from '../../lib/dates'
import { TransactionForm } from './TransactionForm'

afterEach(cleanup)
beforeEach(() => { Element.prototype.scrollIntoView = () => undefined })

const account = (id: string, name: string, status: Account['status'] = 'active'): Account => ({ id, name, type: id === 'CASH' ? 'cash' : 'savings', institution: '', accountNumber: '', status, openingDate: '2026-01-01', openingBalancePaise: 0, currentBalancePaise: 0, createdAt: '', updatedAt: '' })
const category = (id: string, name: string): Category => ({ id, name, parentCategoryId: null, active: true })
const tx = (id: string, date: string, over: Partial<Transaction> = {}): Transaction => ({ id, date, type: 'expense', accountId: 'CASH', fromAccountId: null, toAccountId: null, description: 'Old', amountPaise: 100, categoryId: null, notes: '', createdAt: `${date}T00:00:00Z`, updatedAt: '', ...over })

const accounts = [account('CASH', 'Cash'), account('SB1', 'Savings')]
const categories = [category('food', 'Food'), category('rent', 'Rent'), category('travel', 'Travel')]
const history = [tx('1', '2026-11-01', { categoryId: 'food', accountId: 'SB1', description: 'Lunch' }), tx('2', '2026-11-02', { categoryId: 'food', accountId: 'SB1', description: 'Dinner' }), tx('3', '2026-11-03', { categoryId: 'rent', accountId: 'SB1', description: 'Rent' })]

function setup(props: Partial<Parameters<typeof TransactionForm>[0]> = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(<TransactionForm accounts={accounts} categories={categories} transactions={history} transaction={null} onCancel={() => undefined} onSave={onSave} {...props} />)
  return onSave
}
const amount = () => screen.getByLabelText('Amount (INR)') as HTMLInputElement
const type = (value: string, input: HTMLElement) => fireEvent.change(input, { target: { value } })

describe('TransactionForm (add)', () => {
  it('puts the amount first and focused, with the most recently used account chosen', () => {
    setup()
    expect(document.activeElement).toBe(amount())
    expect(screen.getByRole('radio', { name: 'Savings' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'Today' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByLabelText('Note')).toBeNull()
  })

  it('offers the most used categories as chips, most used first', () => {
    setup()
    const names = screen.getAllByRole('radio').map((chip) => chip.textContent)
    expect(names.indexOf('Food')).toBeGreaterThan(-1)
    expect(names.indexOf('Food')).toBeLessThan(names.indexOf('Rent'))
    expect(names).not.toContain('Travel')
  })

  it('saves an entry with just an amount, a description and one category tap', async () => {
    const onSave = setup()
    type('250', amount())
    type('Coffee', screen.getByLabelText('What was this for?'))
    fireEvent.click(screen.getByRole('radio', { name: 'Rent' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add transaction' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0]).toMatchObject({ type: 'expense', amountPaise: 25000, description: 'Coffee', categoryId: 'rent', accountId: 'SB1', date: todayIso(), notes: '' })
    expect(onSave.mock.calls[0][2]).toBe(false)
  })

  it('needs only an amount and a category tap: the description defaults to the category, or the type', async () => {
    const onSave = setup()
    type('120', amount())
    fireEvent.click(screen.getByRole('radio', { name: 'Rent' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add transaction' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0]).toMatchObject({ description: 'Rent', categoryId: 'rent', amountPaise: 12000 })

    cleanup()
    const second = setup()
    type('30', amount())
    fireEvent.click(screen.getByRole('button', { name: 'Add transaction' }))
    await waitFor(() => expect(second).toHaveBeenCalledTimes(1))
    expect(second.mock.calls[0][0].description).toBe('Expense')
  })

  it('tapping the chosen category again clears it, and a description seen before picks its category', async () => {
    const onSave = setup()
    type('50', amount())
    type('Lunch', screen.getByLabelText('What was this for?'))
    expect(screen.getByRole('radio', { name: 'Food' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('radio', { name: 'Food' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add transaction' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0].categoryId).toBeNull()
  })

  it('reaches any other category through More…, and shows it as a chip', async () => {
    const onSave = setup()
    type('900', amount())
    type('Taxi', screen.getByLabelText('What was this for?'))
    fireEvent.click(screen.getByRole('button', { name: 'More…' }))
    fireEvent.focus(screen.getByRole('combobox', { name: 'Any category' }))
    fireEvent.mouseDown(await screen.findByRole('option', { name: 'Travel' }))
    expect(screen.getByRole('radio', { name: 'Travel' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Add transaction' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0].categoryId).toBe('travel')
  })

  it('has Yesterday and Pick date chips, and the note is hidden until asked for', async () => {
    const onSave = setup()
    type('10', amount())
    type('Snack', screen.getByLabelText('What was this for?'))
    fireEvent.click(screen.getByRole('radio', { name: 'Yesterday' }))
    fireEvent.click(screen.getByRole('button', { name: /Add a note/ }))
    type('with friends', screen.getByLabelText('Note'))
    fireEvent.click(screen.getByRole('button', { name: 'Add transaction' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0]).toMatchObject({ date: shiftIsoDate(todayIso(), -1), notes: 'with friends' })

    cleanup()
    setup()
    expect(screen.queryByLabelText('Date')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Pick date…' }))
    expect(screen.getByLabelText('Date')).toBeTruthy()
  })

  it('"Save & add another" keeps the account and date, clears the rest, and refocuses the amount', async () => {
    const onSave = setup()
    fireEvent.click(screen.getByRole('radio', { name: 'Cash' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Yesterday' }))
    type('75', amount())
    type('Tea', screen.getByLabelText('What was this for?'))
    fireEvent.click(screen.getByRole('button', { name: 'Save & add another' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][2]).toBe(true)
    await waitFor(() => expect(amount().value).toBe(''))
    expect((screen.getByLabelText('What was this for?') as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('radio', { name: 'Cash' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'Yesterday' }).getAttribute('aria-checked')).toBe('true')
    expect(document.activeElement).toBe(amount())
  })

  it('falls back to a dropdown when there are more than four accounts', () => {
    setup({ accounts: ['CASH', 'A', 'B', 'C', 'D'].map((id) => account(id, id)) })
    expect(screen.getByRole('combobox', { name: 'Paid from' })).toBeTruthy()
    expect(screen.queryByRole('radio', { name: 'A' })).toBeNull()
  })

  it('transfers still ask for a from and a to account', async () => {
    const onSave = setup()
    fireEvent.click(screen.getByRole('radio', { name: 'Transfer' }))
    expect(screen.queryByText('Category')).toBeNull()
    type('1000', amount())
    type('ATM', screen.getByLabelText('What was this for?'))
    fireEvent.change(screen.getByLabelText('To account'), { target: { value: 'CASH' } })
    fireEvent.change(screen.getByLabelText('From account'), { target: { value: 'SB1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add transaction' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0]).toMatchObject({ type: 'transfer', accountId: null, fromAccountId: 'SB1', toAccountId: 'CASH', categoryId: null })
  })
})

describe('TransactionForm (edit)', () => {
  it('opens with the saved values, shows the date and note, and asks for an edit note', async () => {
    const saved = tx('9', '2026-10-05', { description: 'Rent', categoryId: 'rent', accountId: 'CASH', notes: 'October', amountPaise: 1800000 })
    const onSave = setup({ transaction: saved })
    expect(amount().value).toBe('18000.00')
    expect((screen.getByLabelText('Date') as HTMLInputElement).value).toBe('2026-10-05')
    expect((screen.getByLabelText('Note') as HTMLTextAreaElement).value).toBe('October')
    expect(screen.getByRole('radio', { name: 'Rent' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'Cash' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByRole('button', { name: 'Save & add another' })).toBeNull()
    type('Corrected', screen.getByLabelText('Edit note (optional)'))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0]).toMatchObject({ id: '9', amountPaise: 1800000 })
    expect(onSave.mock.calls[0][1]).toBe('Corrected')
  })
})
