export function maskAccountNumber(value: string): string {
  if (!value) return '—'
  return `•••• ${value.slice(-4)}`
}

export function downloadFile(filename: string, blob: Blob): void {
  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(blob)
  link.href = objectUrl
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

export function amountInputValue(amountPaise: number): string {
  return (amountPaise / 100).toFixed(2)
}
