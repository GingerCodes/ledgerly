// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChoiceChips } from './ChoiceChips'

afterEach(cleanup)
const options = [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }, { id: 'c', label: 'Gamma' }]

describe('ChoiceChips', () => {
  it('marks the chosen chip and reports taps', () => {
    const onChange = vi.fn()
    render(<><span id="l">Pick</span><ChoiceChips options={options} value="b" onChange={onChange} labelledBy="l" /></>)
    expect(screen.getByRole('radiogroup', { name: 'Pick' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Beta' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('radio', { name: 'Gamma' }))
    expect(onChange).toHaveBeenCalledWith('c')
  })

  it('unselects on a second tap only when allowed', () => {
    const onChange = vi.fn()
    const { rerender } = render(<><span id="l">Pick</span><ChoiceChips options={options} value="a" onChange={onChange} labelledBy="l" /></>)
    fireEvent.click(screen.getByRole('radio', { name: 'Alpha' }))
    expect(onChange).toHaveBeenLastCalledWith('a')
    rerender(<><span id="l">Pick</span><ChoiceChips options={options} value="a" onChange={onChange} labelledBy="l" allowClear /></>)
    fireEvent.click(screen.getByRole('radio', { name: 'Alpha' }))
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('moves with the arrow keys, wrapping around, and only the chosen chip is in the tab order', () => {
    const onChange = vi.fn()
    render(<><span id="l">Pick</span><ChoiceChips options={options} value="c" onChange={onChange} labelledBy="l" /></>)
    expect(screen.getByRole('radio', { name: 'Gamma' }).tabIndex).toBe(0)
    expect(screen.getByRole('radio', { name: 'Alpha' }).tabIndex).toBe(-1)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Gamma' }), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('a')
  })
})
