import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseLocaleNumber(stringNumber: string | number): number {
  if (typeof stringNumber === 'number') return stringNumber;
  if (!stringNumber) return 0;
  
  // Replace comma with dot
  let normalized = stringNumber.replace(',', '.');
  
  // If there are multiple dots, assume the last one is the decimal separator
  // and others are thousand separators (e.g. 1.000.000,50 -> 1.000.000.50 -> 1000000.50)
  const dots = normalized.split('.');
  if (dots.length > 2) {
    const decimal = dots.pop();
    const integer = dots.join('');
    normalized = `${integer}.${decimal}`;
  }
  
  return parseFloat(normalized) || 0;
}
