import { describe, expect, it } from 'vitest'
import { pageTitle, sectionOf } from './navigation'

describe('navigation', () => {
  it('maps paths to sections', () => {
    expect(sectionOf('/overview')).toBe('overview')
    expect(sectionOf('/settings/account')).toBe('settings')
    expect(sectionOf('/')).toBeUndefined()
    expect(sectionOf('/nope')).toBeUndefined()
  })

  it('titles real screens and ignores paths that only redirect', () => {
    expect(pageTitle('/transactions')).toBe('Transactions')
    expect(pageTitle('/settings/backups')).toBe('Settings · Backup & import')
    expect(pageTitle('/settings')).toBe('')
    expect(pageTitle('/settings/unknown')).toBe('')
    expect(pageTitle('/')).toBe('')
  })
})
