// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { menuSections, sections } from '../app/navigation'
import { MobileMenu } from './MobileMenu'

afterEach(cleanup)

function Path() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

function setup() {
  const onClose = vi.fn()
  render(<MemoryRouter initialEntries={['/overview']}><MobileMenu items={menuSections} onClose={onClose} /><Path /></MemoryRouter>)
  return { onClose }
}

describe('phone menu', () => {
  it('holds Accounts, Fixed deposits and Settings, and the bottom bar keeps the other three', () => {
    expect(menuSections.map((item) => item.label)).toEqual(['Accounts', 'Fixed deposits', 'Settings'])
    expect(sections.filter((item) => !item.menu).map((item) => item.label)).toEqual(['Overview', 'Transactions', 'Reports'])
  })

  it('lists the sections, focuses the close button, and closes with Escape, the backdrop or the close button', async () => {
    const { onClose } = setup()
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['Accounts', 'Fixed deposits', 'Settings'])
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close menu' }))

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(onClose).toHaveBeenCalledTimes(2)
    await userEvent.pointer({ keys: '[MouseLeft]', target: document.querySelector('.menu-backdrop')! })
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('goes to the chosen screen and closes', async () => {
    const { onClose } = setup()
    await userEvent.click(screen.getByRole('link', { name: 'Fixed deposits' }))
    expect(screen.getByTestId('path').textContent).toBe('/deposits')
    expect(onClose).toHaveBeenCalledOnce()
  })
})
