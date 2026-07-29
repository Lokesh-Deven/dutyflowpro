import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeTo12Hour(time: string) {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  let h = parseInt(hours, 10);
  h = h % 12 || 12;
  return `${h.toString().padStart(2, '0')}.${minutes}`;
}
