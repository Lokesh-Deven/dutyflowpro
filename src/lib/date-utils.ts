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

/**
 * Converts a 24-hour or raw time string (e.g. "13:00", "14:30", "09:00", "9:30")
 * into 12-hour format with AM/PM (e.g. "01:00 PM", "02:30 PM", "09:00 AM").
 */
export function formatAppTime12Hour(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  // Match HH:MM or HH.MM with optional seconds and optional AM/PM
  const match = trimmed.match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?$/i);
  if (!match) {
    return trimmed;
  }

  let h = parseInt(match[1], 10);
  const minutes = match[2];
  let period = match[3]?.toUpperCase();

  if (period) {
    if (h === 0) h = 12;
    else if (h > 12) h = h % 12 || 12;
  } else {
    period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
  }

  return `${h.toString().padStart(2, '0')}:${minutes} ${period}`;
}

/**
 * Format a start and end time range in 12-hour format (e.g. "01:00 PM to 02:30 PM")
 */
export function formatTimingRange12Hour(
  start: string | null | undefined,
  end: string | null | undefined,
  separator: string = 'to'
): string {
  const formattedStart = formatAppTime12Hour(start);
  const formattedEnd = formatAppTime12Hour(end);
  if (formattedStart && formattedEnd) {
    return `${formattedStart} ${separator} ${formattedEnd}`;
  }
  return formattedStart || formattedEnd || '';
}
