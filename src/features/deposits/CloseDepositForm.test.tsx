// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Account, FixedDeposit } from '../../domain/models'
import { CloseDepositForm } from './CloseDepositForm'

afterEach(cleanup)

const accounts: Account[] = [{ id: 'SB1', name: 'Savings', type: 'savings', institution: 'HDFC', accountNumber: '12341234', status: 'active', openingDate: '2026-01-01', openingBalancePaise: 5_000_000, currentBalancePaise: 5_000_000, createdAt: '', updatedAt: '' }]
const deposit = (fundingAccountId: string | null): FixedDeposit => ({
  id: 'fd', institution: 'SBI', accountNumber: 'FD1', principalPaise: 10_000_000, startDate: '2024-01-01', maturityDate: '2026-01-01', annualRateBasisPoints: 700,
  interestType: 'simple', compoundsPerYear: 1, linkedAccountId: null, fundingAccountId, maturityInstruction: '', status: 'active', closedDate: null, principalReturned: false, notes: '', createdAt: '', updatedAt: '',
})

describe('CloseDepositForm', () => {
  it('asks whether to add the principal only when the deposit had no source account, ticked by default', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<CloseDepositForm deposit={deposit(null)} accounts={accounts} onCancel={() => undefined} onSave={onSave} />)
    const box = screen.getByRole('checkbox') as HTMLInputElement
    expect(box.checked).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Close deposit' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0]).toMatchObject({ accountId: 'SB1', returnPrincipal: true })

    fireEvent.click(box)
    fireEvent.click(screen.getByRole('button', { name: 'Close deposit' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
    expect(onSave.mock.calls[1][0]).toMatchObject({ returnPrincipal: false })
  })

  it('shows no tick box for a deposit that was funded from an account', () => {
    render(<CloseDepositForm deposit={deposit('SB1')} accounts={accounts} onCancel={() => undefined} onSave={async () => undefined} />)
    expect(screen.queryByRole('checkbox')).toBeNull()
  })
})
