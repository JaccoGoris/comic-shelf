export function formatPrice(
  cents?: number | null,
  currency?: string | null,
): string | null {
  if (!cents) return null
  const dollars = (cents / 100).toFixed(2)
  if (currency === 'USD') return `$${dollars}`
  if (currency === 'EUR') return `€${dollars}`
  if (currency === 'GBP') return `£${dollars}`
  return `${dollars} ${currency ?? ''}`
}
