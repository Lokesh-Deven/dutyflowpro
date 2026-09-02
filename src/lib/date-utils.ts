import { format } from 'date-fns';

/**
 * The single universal date format used across DutyFlow: DD.MM.YYYY (e.g., 02.09.2026)
 */
export const APP_DATE_FORMAT = 'dd.MM.yyyy';
export const APP_DATE_TIME_FORMAT = 'dd.MM.yyyy • h:mm a';

/**
 * Format any date object, string, or timestamp into standard DD.MM.YYYY
 */
export function formatAppDate(
  date: Date | string | number | null | undefined,
  fallback: string = ''
): string {
  if (!date) return fallback;
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return fallback;
  return format(d, APP_DATE_FORMAT);
}

/**
 * Format date with day of week: DD.MM.YYYY (EEEE) e.g., 02.09.2026 (Wednesday)
 */
export function formatAppDateWithDay(
  date: Date | string | number | null | undefined,
  fallback: string = ''
): string {
  if (!date) return fallback;
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return fallback;
  return `${format(d, APP_DATE_FORMAT)} (${format(d, 'EEEE')})`;
}

/**
 * Format date and time: DD.MM.YYYY • h:mm a e.g., 02.09.2026 • 10:30 AM
 */
export function formatAppDateTime(
  date: Date | string | number | null | undefined,
  fallback: string = ''
): string {
  if (!date) return fallback;
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return fallback;
  return format(d, APP_DATE_TIME_FORMAT);
}

/**
 * Robust date parser that strictly prioritizes and accepts DD.MM.YYYY.
 * Also handles Excel serial dates, JS Date instances, and other common formats.
 */
export function parseAppDate(raw: any): Date | null {
  if (raw === undefined || raw === null || raw === '') return null;

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw;
  }

  // Handle Excel numeric serial dates (e.g. 45537)
  if (typeof raw === 'number') {
    if (isNaN(raw) || raw <= 0) return null;
    const utc = new Date(Date.UTC(0, 0, raw - 1));
    return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Strict priority: Match DD.MM.YYYY (or with / or - as delimiters)
    const dmy = trimmed.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})$/);
    if (dmy) {
      const day = parseInt(dmy[1], 10);
      const month = parseInt(dmy[2], 10) - 1; // 0-indexed
      let year = parseInt(dmy[3], 10);
      if (year < 100) year += 2000;

      if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
        const dt = new Date(year, month, day);
        if (!isNaN(dt.getTime()) && dt.getDate() === day && dt.getMonth() === month) {
          return dt;
        }
      }
    }

    // Match ISO format YYYY-MM-DD
    const ymd = trimmed.match(/^(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})/);
    if (ymd) {
      const year = parseInt(ymd[1], 10);
      const month = parseInt(ymd[2], 10) - 1;
      const day = parseInt(ymd[3], 10);
      const dt = new Date(year, month, day);
      if (!isNaN(dt.getTime())) {
        return dt;
      }
    }

    // Fallback standard Date parse
    const standard = new Date(trimmed);
    if (!isNaN(standard.getTime())) {
      return standard;
    }
  }

  return null;
}

/**
 * Validate whether a string is a valid DD.MM.YYYY date
 */
export function isValidAppDate(str: string): boolean {
  if (!str) return false;
  return parseAppDate(str) !== null;
}
