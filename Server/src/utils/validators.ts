/**
 * Utility functions for validators
 */

/**
 * Transforms a string or number to an integer
 * @param value - The string or number to convert
 * @returns The value as an integer
 */
export function numberStringToInt(value: string | number): number {
  if (typeof value === 'string') {
    return parseInt(value, 10);
  }
  return value;
} 