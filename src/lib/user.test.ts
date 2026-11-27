import { describe, expect, it } from 'vitest'
import { displayName, fullName } from './user'

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
})
