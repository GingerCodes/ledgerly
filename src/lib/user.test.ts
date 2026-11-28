import { describe, expect, it } from 'vitest'
import { displayName, fullName, yearViewOf } from './user'

describe('displayName', () => {
  it('prefers full_name, then name, then the email', () => {
    expect(displayName({ email: 'a@b.com', user_metadata: { full_name: ' Alex Jose ', name: 'Alex' } })).toBe('Alex Jose')
    expect(displayName({ email: 'a@b.com', user_metadata: { name: 'Alex J' } })).toBe('Alex J')
    expect(displayName({ email: 'a@b.com', user_metadata: { full_name: '  ' } })).toBe('a@b.com')
    expect(displayName({ email: undefined, user_metadata: {} })).toBe('')
  })

  it('fullName is empty when no name is stored', () => {
    expect(fullName({ email: 'a@b.com', user_metadata: {} })).toBe('')
    expect(fullName({ email: 'a@b.com', user_metadata: { full_name: 'Alex' } })).toBe('Alex')
  })

  it('yearViewOf reads the saved preference and defaults to the financial year', () => {
    expect(yearViewOf({ user_metadata: { year_view: 'calendar' } })).toBe('calendar')
    expect(yearViewOf({ user_metadata: { year_view: 'financial' } })).toBe('financial')
    expect(yearViewOf({ user_metadata: {} })).toBe('financial')
    expect(yearViewOf({ user_metadata: { year_view: 'nonsense' } })).toBe('financial')
  })
})
