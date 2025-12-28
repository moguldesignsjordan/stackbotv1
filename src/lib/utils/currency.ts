// src/lib/utils/currency.ts

/**
 * Format a number as US Dollars (USD)
 * @param amount - The amount to format
 * @returns Formatted string like "$1,234.56"
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as currency with $ prefix
 * @param amount - The amount to format
 * @returns Formatted string like "$1,234.56"
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format price for display with optional compact notation for large numbers
 * @param amount - The amount to format
 * @param compact - Whether to use compact notation (e.g., $1.2K)
 */
export function formatPriceCompact(amount: number, compact = false): string {
  if (compact && amount >= 1000) {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(amount);
    return formatted;
  }
  return formatPrice(amount);
}

// Legacy alias for backward compatibility
export const formatDOP = formatUSD; 