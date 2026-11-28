// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AddMenu } from './AddMenu'

describe('AddMenu', () => {
  it('adds a transaction by default and offers an account or deposit from the arrow', () => {
    const onAdd = vi.fn()
    render(<AddMenu onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))
    expect(onAdd).toHaveBeenLastCalledWith('transaction')

    fireEvent.click(screen.getByRole('button', { name: 'More things to add' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Fixed deposit' }))
    expect(onAdd).toHaveBeenLastCalledWith('deposit')
    expect(screen.queryByRole('menu')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'More things to add' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
