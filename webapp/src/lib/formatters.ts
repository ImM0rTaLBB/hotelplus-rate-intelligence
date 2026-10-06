/**
 * Helper utilities for currency and rate formatting.
 * Ensures all prices have thousands separators (commas) and exactly 2 decimal places.
 */
export function formatPrice(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "0.00";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return String(val);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format price with THB currency symbol/suffix.
 * Example: 1107 -> "1,107.00 THB"
 */
export function formatTHB(val: number | string | undefined | null): string {
  return `${formatPrice(val)} THB`;
}
