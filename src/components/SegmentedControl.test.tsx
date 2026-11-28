// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedControl } from './SegmentedControl'

describe('SegmentedControl', () => {
  it('marks the chosen option, positions the sliding highlight and reports changes', () => {
    const onChange = vi.fn()
    render(<SegmentedControl label="Kind" options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B', tone: 'expense' }, { value: 'c', label: 'C' }]} value="b" onChange={onChange} />)
    const group = screen.getByRole('radiogroup', { name: 'Kind' })
    expect(group.style.getPropertyValue('--n')).toBe('3')
    expect(group.style.getPropertyValue('--i')).toBe('1')
    expect(group.getAttribute('data-tone')).toBe('expense')
    expect(screen.getByRole('radio', { name: 'B' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('radio', { name: 'C' }))
    expect(onChange).toHaveBeenCalledWith('c')
  })
})
