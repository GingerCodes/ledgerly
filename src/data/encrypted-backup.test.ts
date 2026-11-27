import { describe, expect, it } from 'vitest'
import { decryptBackup, encryptBackup } from './encrypted-backup'

describe('encrypted database backups', () => {
  it('round-trips bytes with the correct passphrase', async () => {
    const original = new Uint8Array([0, 1, 2, 127, 254, 255])
    const encrypted = await encryptBackup(original, 'a-long-test-passphrase')

    expect(encrypted).not.toEqual(original)
    expect(await decryptBackup(encrypted, 'a-long-test-passphrase')).toEqual(original)
  })

  it('rejects short passphrases and reports an incorrect passphrase', async () => {
    await expect(encryptBackup(new Uint8Array([1]), 'short')).rejects.toThrow('12 characters')
    const encrypted = await encryptBackup(new Uint8Array([1, 2, 3]), 'a-long-test-passphrase')

    await expect(decryptBackup(encrypted, 'a-different-passphrase')).rejects.toThrow('Could not decrypt')
  })
})
