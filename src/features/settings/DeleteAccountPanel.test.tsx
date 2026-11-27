// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinanceContext, type FinanceContextValue } from '../../app/finance-context'
import type { FinanceDatabase } from '../../data/finance-database'
import { DeleteAccountPanel } from './DeleteAccountPanel'

afterEach(cleanup)

function setup(deleteAccount: () => Promise<void>, onDeleted = vi.fn(async () => null)) {
  const showError = vi.fn()
  const finance = { database: { deleteAccount } as unknown as FinanceDatabase, showError } as unknown as FinanceContextValue
  render(<FinanceContext.Provider value={finance}><DeleteAccountPanel onShowBackup={() => undefined} onDeleted={onDeleted} /></FinanceContext.Provider>)
  return { showError, onDeleted, button: screen.getByRole('button', { name: 'Delete my account' }) as HTMLButtonElement }
}

describe('DeleteAccountPanel', () => {
  it('stays disabled until DELETE is typed exactly, then deletes and ends the session', async () => {
    const deleteAccount = vi.fn(async () => undefined)
    const { button, onDeleted } = setup(deleteAccount)
    const input = screen.getByLabelText(/Type DELETE/)

    expect(button.disabled).toBe(true)
    await userEvent.type(input, 'delete')
    expect(button.disabled).toBe(true)
    await userEvent.clear(input)
    await userEvent.type(input, 'DELETE')
    expect(button.disabled).toBe(false)

    await userEvent.click(button)
    expect(deleteAccount).toHaveBeenCalledOnce()
    expect(onDeleted).toHaveBeenCalledOnce()
  })

  it('shows the error and does not end the session when deletion fails', async () => {
    const failure = new Error('Could not delete your account: nope')
    const { button, onDeleted, showError } = setup(async () => { throw failure })

    await userEvent.type(screen.getByLabelText(/Type DELETE/), 'DELETE')
    await userEvent.click(button)

    expect(showError).toHaveBeenCalledWith(failure)
    expect(onDeleted).not.toHaveBeenCalled()
    expect(button.disabled).toBe(false)
  })
})
