// src/lib/utils/currency.ts

/**
 * Format a number as Dominican Pesos (DOP)
 * @param amount - The amount to format
 * @returns Formatted string like "RD$ 1,234.56"
 */
export function formatDOP(amount: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as Dominican Pesos with custom symbol
 * Uses RD$ prefix which is more recognizable
 * @param amount - The amount to format
 * @returns Formatted string like "RD$ 1,234.56"
 */
export function formatPrice(amount: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `RD$ ${formatted}`;
}

/**
 * Format price for display with optional compact notation for large numbers
 * @param amount - The amount to format
 * @param compact - Whether to use compact notation (e.g., RD$ 1.2K)
 */
export function formatPriceCompact(amount: number, compact = false): string {
  if (compact && amount >= 1000) {
    const formatted = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(amount);
    return `RD$ ${formatted}`;
  }
  return formatPrice(amount);
}