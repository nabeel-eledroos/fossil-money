export function formatMoney(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

export function formatShort(n: number): string {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K'
  return '$' + n
}

export const SECTORS: Record<string, { label: string; color: string }> = {
  oil_gas: { label: 'Oil & gas', color: 'var(--color-crude)' },
  coal: { label: 'Coal', color: 'var(--color-coal)' },
  utilities: { label: 'Electric utilities', color: 'var(--color-util)' },
  mining: { label: 'Mining', color: 'var(--color-mining)' }
}
