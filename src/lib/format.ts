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

/** Short rupee amounts for chart labels in Indian units: "₹4.08 L", "₹1.2 Cr". */
export function formatCompactRupees(amountPaise: number): string {
  const rupees = Math.abs(amountPaise) / 100
  const sign = amountPaise < 0 ? '−' : ''
  const short = (value: number, unit: string) => `${sign}₹${Number(value.toFixed(2))} ${unit}`
  if (rupees >= 1e7) return short(rupees / 1e7, 'Cr')
  if (rupees >= 1e5) return short(rupees / 1e5, 'L')
  if (rupees >= 1e3) return short(rupees / 1e3, 'K')
  return `${sign}₹${Math.round(rupees)}`
}
