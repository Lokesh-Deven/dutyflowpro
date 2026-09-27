import {
  ExaminationTimetable,
  TimetableClassColumn,
  TimetableRow,
  TimetableClassTiming,
} from './examination-timetable-types';
import { STANDARD_STUDENT_SUBJECTS } from './student-seating-service';
import {
  isUUID,
  syncExaminationTimetableToDatabase,
  fetchUserTimetablesFromDatabase,
  deleteExaminationTimetableFromDatabase,
  syncUserWorkspaceToDatabase,
  fetchUserWorkspaceFromDatabase,
} from './storage-service';

const STORAGE_PREFIX = 'dutyflow_examination_timetables_';

/**
 * Generate 12-hour clock times at 15-minute intervals (7:00 AM to 7:00 PM)
 */
export function generateTimeIntervals(): string[] {
  const times: string[] = [];
  const startHour = 7;
  const endHour = 19; // 7 PM
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === endHour && m > 0) break;
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      const minuteStr = m.toString().padStart(2, '0');
      times.push(`${hour12}:${minuteStr} ${ampm}`);
    }
  }
  return times;
}

/**
 * Convert 12-hour formatted time (e.g., '10:15 AM') to total minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Validate that End Time is strictly later than Start Time
 */
export function isEndTimeValid(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return true;
  if (startTime === '-' || startTime === '—' || endTime === '-' || endTime === '—') return true;
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  if (startMin === null || endMin === null) return true;
  return endMin > startMin;
}

/**
 * Format 'YYYY-MM-DD' strictly to 'DD.MM.YYYY'
 */
export function formatDateToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
  }
  return dateStr;
}

/**
 * Get weekday name from 'YYYY-MM-DD' strictly (e.g., '2026-09-29' -> 'Tuesday')
 */
export function getDayFromDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[d.getDay()] || '';
  }
  return '';
}

/**
 * Sort timetable rows chronologically by date
 */
export function sortTimetableRows(rows: TimetableRow[]): TimetableRow[] {
  return [...rows].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
}

/**
 * Calculate Date Range string from sorted rows (e.g., '29.09.2026 – 08.10.2026')
 */
export function computeDateRange(rows: TimetableRow[]): string {
  const validDates = rows.filter((r) => Boolean(r.date)).sort((a, b) => a.date.localeCompare(b.date));
  if (validDates.length === 0) return 'No dates scheduled';
  if (validDates.length === 1) return validDates[0].displayDate;
  return `${validDates[0].displayDate} – ${validDates[validDates.length - 1].displayDate}`;
}

/**
 * Get storage key scoped to user or guest
 */
function getStorageKey(userId?: string): string {
  return `${STORAGE_PREFIX}${userId || 'guest'}`;
}

/**
 * Fetch all saved examination timetables from localStorage
 */
export function getSavedTimetables(userId?: string): ExaminationTimetable[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getStorageKey(userId);
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as ExaminationTimetable[];
  } catch (err) {
    console.error('Failed to load saved timetables:', err);
    return [];
  }
}

/**
 * Save or update a timetable in localStorage and securely sync to Supabase database
 */
export function saveTimetable(timetable: ExaminationTimetable, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getStorageKey(userId);
    const existing = getSavedTimetables(userId);
    const index = existing.findIndex((t) => t.id === timetable.id);

    const updated = {
      ...timetable,
      updatedAt: new Date().toISOString(),
    };

    let nextList: ExaminationTimetable[];
    if (index >= 0) {
      nextList = [...existing];
      nextList[index] = updated;
    } else {
      nextList = [updated, ...existing];
    }

    localStorage.setItem(key, JSON.stringify(nextList));

    // Cloud persistence strictly tied to authenticated user
    if (userId && isUUID(userId)) {
      syncExaminationTimetableToDatabase(updated, userId).catch((err) => {
        console.error('Failed to sync examination timetable to Supabase:', err);
      });
      syncUserWorkspaceToDatabase(userId, {
        timetables: nextList,
        activeTimetableId: updated.id,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to save timetable:', err);
  }
}

/**
 * Delete a timetable from localStorage and Supabase database
 */
export function deleteTimetable(id: string, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getStorageKey(userId);
    const existing = getSavedTimetables(userId);
    const nextList = existing.filter((t) => t.id !== id);
    localStorage.setItem(key, JSON.stringify(nextList));

    // Delete from Supabase database
    if (userId && isUUID(userId)) {
      deleteExaminationTimetableFromDatabase(id, userId).catch((err) => {
        console.error('Failed to delete examination timetable from Supabase:', err);
      });
      syncUserWorkspaceToDatabase(userId, {
        timetables: nextList,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to delete timetable:', err);
  }
}

/**
 * Toggle lock state for a timetable in localStorage and Supabase database
 */
export function toggleLockTimetable(id: string, isLocked: boolean, userId?: string): ExaminationTimetable | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getStorageKey(userId);
    const existing = getSavedTimetables(userId);
    const index = existing.findIndex((t) => t.id === id);
    if (index < 0) return null;

    const updated = {
      ...existing[index],
      isLocked,
      updatedAt: new Date().toISOString(),
    };
    existing[index] = updated;
    localStorage.setItem(key, JSON.stringify(existing));

    // Cloud persistence for lock state
    if (userId && isUUID(userId)) {
      syncExaminationTimetableToDatabase(updated, userId).catch((err) => {
        console.error('Failed to sync timetable lock state to Supabase:', err);
      });
      syncUserWorkspaceToDatabase(userId, {
        timetables: existing,
      }).catch(() => {});
    }

    return updated;
  } catch (err) {
    console.error('Failed to update lock state:', err);
    return null;
  }
}

/**
 * Fetch timetables from Supabase database and merge with local cache.
 * Guarantees cross-device availability when switching devices or browsers.
 */
export async function fetchTimetablesFromCloud(userId?: string): Promise<ExaminationTimetable[]> {
  if (!userId || !isUUID(userId)) {
    return getSavedTimetables(userId);
  }

  try {
    const [dbTimetables, ws] = await Promise.all([
      fetchUserTimetablesFromDatabase(userId),
      fetchUserWorkspaceFromDatabase(userId),
    ]);

    const map = new Map<string, ExaminationTimetable>();
    if (Array.isArray(ws?.timetables)) {
      ws.timetables.forEach((t) => {
        if (t && t.id) map.set(t.id, t);
      });
    }
    if (Array.isArray(dbTimetables)) {
      dbTimetables.forEach((t) => {
        if (t && t.id) map.set(t.id, t);
      });
    }

    // Also include any local entries not yet synced to cloud and opportunistically sync them
    const local = getSavedTimetables(userId);
    local.forEach((t) => {
      if (t && t.id && !map.has(t.id)) {
        map.set(t.id, t);
        syncExaminationTimetableToDatabase(t, userId).catch(() => {});
      }
    });

    const merged = Array.from(map.values()).sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt || '';
      const dateB = b.updatedAt || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });

    // Update local cache
    if (typeof window !== 'undefined') {
      const key = getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(merged));
    }

    return merged;
  } catch (err) {
    console.error('Failed to fetch timetables from cloud:', err);
    return getSavedTimetables(userId);
  }
}

/**
 * Create a new empty timetable scaffold
 */
export function createNewTimetable(
  institutionName: string = '',
  examinationName: string = 'First PUC Midterm Examination – September 2026'
): ExaminationTimetable {
  const initialClassId = 'class-1';
  const initialClass: TimetableClassColumn = {
    id: initialClassId,
    name: 'Class 1',
  };

  const todayIso = new Date().toISOString().split('T')[0];
  const initialRow: TimetableRow = {
    id: 'row-1',
    date: todayIso,
    displayDate: formatDateToDDMMYYYY(todayIso),
    day: getDayFromDate(todayIso),
    subjects: ['English'],
    timings: {
      [initialClassId]: {
        startTime: '10:00 AM',
        endTime: '01:00 PM',
      },
    },
  };

  return {
    id: `tt-${Date.now()}`,
    institutionName,
    examinationName,
    title: 'TIMETABLE',
    classes: [initialClass],
    rows: [initialRow],
    isLocked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Default subject options for multiple selection dropdown
 */
export const DEFAULT_SUBJECT_OPTIONS: string[] = [
  ...STANDARD_STUDENT_SUBJECTS,
];
