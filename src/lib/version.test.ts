import { describe, expect, it } from 'vitest'
import { formatVersion } from './version'

describe('formatVersion', () => {
  it('shows the release tag and a short commit id', () => {
    expect(formatVersion('v2026.11.27-17', 'a1b2c3d4e5f6a7b8')).toBe('v2026.11.27-17 · a1b2c3d')
  })
  it('falls back to whatever is available, then to dev', () => {
    expect(formatVersion(undefined, 'a1b2c3d4e5')).toBe('a1b2c3d')
    expect(formatVersion('v1', '')).toBe('v1')
    expect(formatVersion(undefined, undefined)).toBe('dev')
  })
})
