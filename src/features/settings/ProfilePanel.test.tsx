// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinanceContext, type FinanceContextValue } from '../../app/finance-context'
import { ProfilePanel } from './ProfilePanel'

afterEach(cleanup)

function setup(onSave: (name: string) => Promise<Error | null>, fullName = 'Alex Jose') {
  const showSuccess = vi.fn()
  const showError = vi.fn()
  const finance = { showSuccess, showError } as unknown as FinanceContextValue
  render(<FinanceContext.Provider value={finance}><ProfilePanel fullName={fullName} email="a@b.com" onSave={onSave} /></FinanceContext.Provider>)
  return { showSuccess, showError, button: screen.getByRole('button', { name: 'Save name' }) as HTMLButtonElement, input: screen.getByLabelText('Full name') }
}

describe('ProfilePanel', () => {
  it('saves a trimmed new name and confirms', async () => {
    const onSave = vi.fn(async () => null)
    const { button, input, showSuccess } = setup(onSave)
    expect(button.disabled).toBe(true) // unchanged

    await userEvent.clear(input)
    await userEvent.type(input, '  Alex J. Jose ')
    expect(button.disabled).toBe(false)
    await userEvent.click(button)

    expect(onSave).toHaveBeenCalledWith('Alex J. Jose')
    expect(showSuccess).toHaveBeenCalledWith('Name updated.')
  })

  it('shows the error when saving fails, and never saves a blank name', async () => {
    const failure = new Error('network down')
    const { button, input, showError } = setup(async () => failure)
    await userEvent.type(input, ' II')
    await userEvent.click(button)
    expect(showError).toHaveBeenCalledWith(failure)

    const onSave = vi.fn(async () => null)
    cleanup()
    const blank = setup(onSave, '')
    expect(blank.button.disabled).toBe(true)
    await userEvent.type(blank.input, '   ')
    expect(blank.button.disabled).toBe(true)
    expect(onSave).not.toHaveBeenCalled()
  })
})
