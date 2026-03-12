const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatCurrency(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

export function formatNumber(n: number): string {
  return n.toLocaleString()
}
