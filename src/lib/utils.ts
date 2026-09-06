import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeTo12Hour(time: string, includePeriod: boolean = false): string {
  if (!time) return '';
  const cleanTime = time.trim();
  const match = cleanTime.match(/^(\d{1,2})[:\.](\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?$/i);
  if (!match) {
    return cleanTime;
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

  const formatted = `${h.toString().padStart(2, '0')}.${minutes}`;
  return includePeriod ? `${formatted} ${period}` : formatted;
}

/**
 * Extracts the single monogram initial of the FIRST NAME of an invigilator.
 * Strictly ignores honorific titles such as:
 * Mr, Mrs, Ms, Miss, Dr, Prof, Professor, Shri, Smt, Sri, Er, Rev, Adv, Col, Capt, etc.
 * with or without trailing dot (.) and with or without whitespace.
 *
 * Examples:
 * - "Mrs.Shobha" -> "S"
 * - "Prof.Ravikanth" -> "R"
 * - "Prof. Ravikanth" -> "R"
 * - "Dr. Smith" -> "S"
 * - "Mr. Suresh" -> "S"
 * - "Dronacharya" -> "D"
 */
export function getInvigilatorInitial(name: string | undefined | null): string {
  if (!name) return 'F';
  let cleaned = name.trim();
  
  // Title pattern: title word followed by either a dot or whitespace
  const titleRegex = /^(prof(?:essor)?|dr|mrs|mr|ms|miss|shri|smt|sri|er|rev|adv|col|capt)(?:\.|\s+)\s*/i;
  
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned.replace(titleRegex, '').trim();
  }
  
  const match = cleaned.match(/[a-zA-Z]/);
  return match ? match[0].toUpperCase() : (cleaned.charAt(0) || 'F').toUpperCase();
}

/**
 * Formats an array of working days into a human-friendly compact label.
 * Examples:
 * - ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] -> "All Days (Mon–Sat)"
 * - 7 days -> "All 7 Days"
 * - ['Monday', 'Tuesday', 'Wednesday'] -> "Mon, Tue, Wed"
 * - [] -> "Not Set"
 * - undefined -> "All Days (Mon–Sat)"
 */
export function formatWorkingDaysSummary(workingDays?: string[]): string {
  if (!workingDays) return 'All Days (Mon–Sat)';
  if (!Array.isArray(workingDays) || workingDays.length === 0) return 'Not Set';
  
  const shortMap: Record<string, string> = {
    'Monday': 'Mon',
    'Tuesday': 'Tue',
    'Wednesday': 'Wed',
    'Thursday': 'Thu',
    'Friday': 'Fri',
    'Saturday': 'Sat',
    'Sunday': 'Sun',
  };

  const hasAllMonSat = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].every(d => workingDays.includes(d));
  if (workingDays.length === 7) return 'All 7 Days';
  if (hasAllMonSat && workingDays.length === 6) return 'All Days (Mon–Sat)';
  if (workingDays.length === 5 && ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].every(d => workingDays.includes(d))) {
    return 'Mon–Fri (5 Days)';
  }

  const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const sorted = [...workingDays].sort((a, b) => order.indexOf(a) - order.indexOf(b));

  if (sorted.length <= 3) {
    return sorted.map(d => shortMap[d] || d.slice(0, 3)).join(', ');
  }
  return `${sorted.length} Days / Wk`;
}

/**
 * Checks if a given examination date matches an invigilator's configured working days.
 */
export function isDateInWorkingDays(date: Date | string, workingDays?: string[]): boolean {
  let d: Date;
  if (typeof date === 'string') {
    const clean = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      d = new Date(`${clean}T12:00:00`);
    } else {
      d = new Date(clean);
    }
  } else {
    d = date;
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[d.getDay()];

  if (!workingDays || workingDays.length === 0) {
    // Default is standard Mon-Sat
    return d.getDay() !== 0; // 0 is Sunday
  }
  return workingDays.includes(dayName);
}

/**
 * Computes the availability status ({ isAvailableAllDays, availableExamIds }) for an invigilator
 * based on their configured recurring working days and the current examination timetable.
 */
export function getMatchingExamIdsForWorkingDays(
  examinations: { id: string; date: Date | string }[],
  workingDays?: string[]
): { isAvailableAllDays: boolean; availableExamIds: string[] } {
  if (!examinations || examinations.length === 0) {
    return { isAvailableAllDays: true, availableExamIds: [] };
  }

  // If workingDays is not configured, default full-time (Mon-Sat)
  if (!workingDays || workingDays.length === 0) {
    const allMatch = examinations.every(exam => isDateInWorkingDays(exam.date));
    if (allMatch) {
      return { isAvailableAllDays: true, availableExamIds: [] };
    }
    const matching = examinations.filter(exam => isDateInWorkingDays(exam.date)).map(e => e.id);
    return { isAvailableAllDays: false, availableExamIds: matching };
  }

  const matching = examinations.filter(exam => isDateInWorkingDays(exam.date, workingDays)).map(e => e.id);
  if (matching.length === examinations.length) {
    return { isAvailableAllDays: true, availableExamIds: [] };
  }
  return { isAvailableAllDays: false, availableExamIds: matching };
}



