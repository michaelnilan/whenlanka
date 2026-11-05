import type { Month } from './types';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const monthName = (m: Month) => MONTH_NAMES[m - 1];
export const monthSlug = (m: Month) => MONTH_NAMES[m - 1].toLowerCase();
export const monthFromSlug = (s: string): Month | undefined => {
  const i = MONTH_NAMES.findIndex((n) => n.toLowerCase() === s.toLowerCase());
  return i === -1 ? undefined : ((i + 1) as Month);
};
export const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => (i + 1) as Month);
