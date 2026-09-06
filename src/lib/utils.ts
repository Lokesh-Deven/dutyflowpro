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


