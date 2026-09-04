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

