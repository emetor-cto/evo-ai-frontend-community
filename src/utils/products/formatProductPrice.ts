/** Format a product/catalog money value without forcing 2-decimal rounding. */
export function formatProductPrice(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    }).format(value);
  } catch {
    return `${currency} ${formatProductAmount(value)}`;
  }
}

/** Plain amount (no currency symbol), preserving up to 6 decimals. */
export function formatProductAmount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(Number(value) || 0);
}
