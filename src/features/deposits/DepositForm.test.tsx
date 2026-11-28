// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DepositForm } from './DepositForm'

const accounts = [{ id: 'SB1', name: 'Savings', type: 'savings' as const, institution: 'HDFC', accountNumber: '12341234', status: 'active' as const, openingDate: '2026-01-01', openingBalancePaise: 5_000_000, currentBalancePaise: 5_000_000, createdAt: '', updatedAt: '' }]

afterEach(cleanup)

describe('DepositForm interest frequency', () => {
  it('offers named frequencies for payout interest and saves the matching number', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<DepositForm deposit={null} accounts={accounts} onCancel={() => undefined} onSave={onSave} />)
    fireEvent.change(screen.getByLabelText('Bank / institution'), { target: { value: 'SBI' } })
    fireEvent.change(screen.getByLabelText('FD account / reference number'), { target: { value: 'FD1' } })
    fireEvent.change(screen.getByLabelText('Principal (INR)'), { target: { value: '100000' } })
    fireEvent.change(screen.getByLabelText('Annual interest rate (%)'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Maturity date'), { target: { value: '2030-01-01' } })
    fireEvent.change(screen.getByLabelText(/Funded from/), { target: { value: 'SB1' } })
    fireEvent.change(screen.getByLabelText('Interest calculation'), { target: { value: 'payout' } })

    const frequency = screen.getByLabelText(/Interest paid out/)
    expect([...frequency.querySelectorAll('option')].map((option) => option.textContent)).toEqual(['Monthly', 'Quarterly', 'Half-yearly', 'Yearly'])
    fireEvent.change(frequency, { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save deposit' }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toMatchObject({ interestType: 'payout', compoundsPerYear: 4 })
  })

  it('keeps an unusual saved frequency selectable instead of changing it', () => {
    const deposit = { id: 'fd', institution: 'SBI', accountNumber: 'FD1', principalPaise: 1_000_000, startDate: '2026-01-01', maturityDate: '2027-01-01', annualRateBasisPoints: 700, interestType: 'compound' as const, compoundsPerYear: 365, linkedAccountId: null, fundingAccountId: null, maturityInstruction: '', status: 'active' as const, closedDate: null, principalReturned: false, notes: '', createdAt: '', updatedAt: '' }
    render(<DepositForm deposit={deposit} accounts={accounts} onCancel={() => undefined} onSave={async () => undefined} />)
    expect((screen.getByLabelText(/Compounded/) as HTMLSelectElement).value).toBe('365')
  })

  it('lets a new deposit be saved with no source account, and only warns about a past start date when a source is chosen', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<DepositForm deposit={null} accounts={accounts} onCancel={() => undefined} onSave={onSave} />)
    fireEvent.change(screen.getByLabelText('Bank / institution'), { target: { value: 'SBI' } })
    fireEvent.change(screen.getByLabelText('FD account / reference number'), { target: { value: 'FD1' } })
    fireEvent.change(screen.getByLabelText('Principal (INR)'), { target: { value: '100000' } })
    fireEvent.change(screen.getByLabelText('Annual interest rate (%)'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText('Maturity date'), { target: { value: '2027-01-01' } })

    expect(screen.getByText(/Nothing is taken from an account/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save deposit' }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0]).toMatchObject({ fundingAccountId: null, startDate: '2024-01-01' })

    fireEvent.change(screen.getByLabelText(/Funded from/), { target: { value: 'SB1' } })
    expect(screen.getByText(/If this deposit started before the balance you entered, leave this empty/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: new Date().toISOString().slice(0, 10) } })
    expect(screen.queryByText(/leave this empty/)).toBeNull()
  })
})
