const FORMAT_HEADER = new TextEncoder().encode('PFTB1')
const SALT_LENGTH = 16
const IV_LENGTH = 12
const KEY_ITERATIONS = 310_000
const AUTHENTICATED_TAG_LENGTH = 128

export function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    copyToArrayBuffer(new TextEncoder().encode(passphrase)),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: copyToArrayBuffer(salt), iterations: KEY_ITERATIONS },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptBackup(
  databaseBytes: Uint8Array,
  passphrase: string,
): Promise<Uint8Array> {
  if (passphrase.length < 12) {
    throw new Error('Use a backup passphrase with at least 12 characters.')
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(passphrase, salt)
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: copyToArrayBuffer(iv), tagLength: AUTHENTICATED_TAG_LENGTH },
      key,
      copyToArrayBuffer(databaseBytes),
    ),
  )
  const backup = new Uint8Array(FORMAT_HEADER.length + salt.length + iv.length + encrypted.length)
  backup.set(FORMAT_HEADER)
  backup.set(salt, FORMAT_HEADER.length)
  backup.set(iv, FORMAT_HEADER.length + salt.length)
  backup.set(encrypted, FORMAT_HEADER.length + salt.length + iv.length)
  return backup
}

export async function decryptBackup(
  backupBytes: Uint8Array,
  passphrase: string,
): Promise<Uint8Array> {
  const minimumLength = FORMAT_HEADER.length + SALT_LENGTH + IV_LENGTH + AUTHENTICATED_TAG_LENGTH / 8
  if (backupBytes.length < minimumLength) throw new Error('This backup file is incomplete.')
  if (!FORMAT_HEADER.every((byte, index) => backupBytes[index] === byte)) {
    throw new Error('This is not a supported finance backup file.')
  }

  const saltStart = FORMAT_HEADER.length
  const ivStart = saltStart + SALT_LENGTH
  const encryptedStart = ivStart + IV_LENGTH
  const salt = backupBytes.slice(saltStart, ivStart)
  const iv = backupBytes.slice(ivStart, encryptedStart)
  const encrypted = backupBytes.slice(encryptedStart)
  const key = await deriveKey(passphrase, salt)
  try {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: copyToArrayBuffer(iv), tagLength: AUTHENTICATED_TAG_LENGTH },
        key,
        copyToArrayBuffer(encrypted),
      ),
    )
  } catch {
    throw new Error('Could not decrypt this backup. Check the passphrase and file.')
  }
}
