import { describe, expect, it } from 'vitest'
import { displayName } from './user'

describe('displayName', () => {
  it('prefers full_name, then name, then the email', () => {
    expect(displayName({ email: 'a@b.com', user_metadata: { full_name: ' Alex Jose ', name: 'Alex' } })).toBe('Alex Jose')
    expect(displayName({ email: 'a@b.com', user_metadata: { name: 'Alex J' } })).toBe('Alex J')
    expect(displayName({ email: 'a@b.com', user_metadata: { full_name: '  ' } })).toBe('a@b.com')
    expect(displayName({ email: undefined, user_metadata: {} })).toBe('')
  })
})
