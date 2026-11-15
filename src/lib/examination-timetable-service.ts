import {
  ExaminationTimetable,
  TimetableClassColumn,
  TimetableRow,
  TimetableSlot,
  TimetableClassTiming,
  PublishedTimetableRecord,
  ExaminationStatus,
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
const ACTIVE_TIMETABLE_STORAGE_PREFIX = 'dutyflow_active_timetable_id_';

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
 * Normalizes timetable rows to group multiple schedule slots under a single Date & Day.
 * Automatically groups legacy separate rows that share the same date into a unified date row with slots.
 */
export function normalizeTimetableRows(rows: TimetableRow[]): TimetableRow[] {
  if (!rows || rows.length === 0) return [];

  const dateMap = new Map<string, TimetableRow>();

  for (const r of rows) {
    const dateKey = r.date ? r.date.trim() : `unknown-${r.id}`;

    let extractedSlots: TimetableSlot[] = [];
    if (Array.isArray(r.slots) && r.slots.length > 0) {
      extractedSlots = r.slots.map((s, idx) => ({
        id: s.id || `slot-${r.id}-${idx + 1}`,
        course: s.course !== undefined ? s.course : '1&2 PUC',
        subjects: Array.isArray(s.subjects) ? s.subjects : [],
        timings: s.timings || {},
      }));
    } else {
      extractedSlots = [
        {
          id: `slot-${r.id}-1`,
          course: r.course !== undefined ? r.course : '1&2 PUC',
          subjects: Array.isArray(r.subjects) ? r.subjects : [],
          timings: r.timings || {},
        },
      ];
    }

    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, {
        id: r.id,
        date: r.date,
        displayDate: r.displayDate || (r.date ? formatDateToDDMMYYYY(r.date) : '—'),
        day: r.day || (r.date ? getDayFromDate(r.date) : '—'),
        slots: extractedSlots,
        course: extractedSlots[0]?.course,
        subjects: extractedSlots[0]?.subjects,
        timings: extractedSlots[0]?.timings,
      });
    } else {
      const existing = dateMap.get(dateKey)!;
      existing.slots = [...existing.slots, ...extractedSlots];
    }
  }

  return sortTimetableRows(Array.from(dateMap.values()));
}

/**
 * Ensures an entire ExaminationTimetable has normalized rows
 */
export function normalizeTimetable(timetable: ExaminationTimetable): ExaminationTimetable {
  if (!timetable) return timetable;
  return {
    ...timetable,
    rows: normalizeTimetableRows(timetable.rows || []),
  };
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
 * Storage key for the single active examination timetable ID
 */
export function getActiveTimetableStorageKey(userId?: string): string {
  return `${ACTIVE_TIMETABLE_STORAGE_PREFIX}${userId || 'guest'}`;
}

/**
 * Get currently active examination timetable ID (if any)
 */
export function getActiveTimetableId(userId?: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = getActiveTimetableStorageKey(userId);
    const directId = localStorage.getItem(key);
    if (directId && directId !== 'null' && directId !== 'undefined') {
      return directId;
    }
    // Fallback: check if any saved timetable is marked isActive
    const listKey = getStorageKey(userId);
    const raw = localStorage.getItem(listKey);
    if (raw) {
      const list = JSON.parse(raw) as ExaminationTimetable[];
      const activeItem = list.find((t) => t.isActive || t.status === 'Active');
      if (activeItem) {
        localStorage.setItem(key, activeItem.id);
        return activeItem.id;
      }
    }
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Determine the effective examination status among: 'Draft' | 'Finalised' | 'Active' | 'Archived'
 */
export function getTimetableEffectiveStatus(
  timetable: ExaminationTimetable,
  activeTimetableId?: string | null
): ExaminationStatus {
  const isCurrentlyActive = timetable.isActive || (Boolean(activeTimetableId) && timetable.id === activeTimetableId);
  if (isCurrentlyActive) {
    return 'Active';
  }
  if (timetable.status === 'Archived') {
    return 'Archived';
  }
  if (timetable.isLocked || timetable.status === 'Finalised') {
    return 'Finalised';
  }
  return 'Draft';
}

/**
 * Fetch all saved examination timetables from localStorage with accurate active state and status
 */
export function getSavedTimetables(userId?: string): ExaminationTimetable[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getStorageKey(userId);
    const data = localStorage.getItem(key);
    if (!data) return [];
    const list = JSON.parse(data) as ExaminationTimetable[];
    const activeId = getActiveTimetableId(userId);

    return list.map((item) => {
      const normalized = normalizeTimetable(item);
      const isActive = Boolean(activeId && normalized.id === activeId);
      const status = getTimetableEffectiveStatus(normalized, activeId);
      return {
        ...normalized,
        isActive,
        status,
      };
    });
  } catch (err) {
    console.error('Failed to load saved timetables:', err);
    return [];
  }
}

/**
 * Get the currently active ExaminationTimetable object (or null if none active)
 */
export function getActiveTimetable(userId?: string): ExaminationTimetable | null {
  const activeId = getActiveTimetableId(userId);
  if (!activeId) return null;
  const timetables = getSavedTimetables(userId);
  return timetables.find((t) => t.id === activeId) || null;
}

/**
 * Activates an examination timetable.
 * Requirement 1: Makes it operational across Seating Allocation, Student Attendance, Student Portal and Invigilator Portal.
 * Requirement 2: Only one examination timetable can be active at a time.
 * Requirement 3: Automatically deactivates the previously active timetable.
 */
export async function activateTimetable(
  id: string,
  userId?: string,
  institutionId?: string,
  institutionCode?: string
): Promise<{ success: boolean; activeTimetable?: ExaminationTimetable; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'Window is not defined' };
  try {
    const listKey = getStorageKey(userId);
    const activeKey = getActiveTimetableStorageKey(userId);
    const existing = getSavedTimetables(userId);
    const target = existing.find((t) => t.id === id);
    if (!target) return { success: false, error: 'Timetable not found' };

    const now = new Date().toISOString();

    // 1. Single active invariant: Target becomes Active, all others become inactive / Finalised if they were Active
    const nextList: ExaminationTimetable[] = existing.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          isActive: true,
          status: 'Active' as ExaminationStatus,
          isLocked: true, // Finalised/Locked upon activation to guarantee examination integrity
          isPublished: true,
          publishedAt: t.publishedAt || now,
          updatedAt: now,
        };
      } else if (t.isActive || t.status === 'Active') {
        return {
          ...t,
          isActive: false,
          status: 'Finalised' as ExaminationStatus,
          updatedAt: now,
        };
      }
      return t;
    });

    const activeTimetable = nextList.find((t) => t.id === id)!;

    // 2. Persist to localStorage
    localStorage.setItem(listKey, JSON.stringify(nextList));
    localStorage.setItem(activeKey, id);

    // 3. Operationalize on Student Portal:
    // Only the single active timetable is published and visible on the Student Portal!
    const instId = institutionId || userId || 'guest';
    const rows = activeTimetable.rows || [];
    const totalDays = rows.filter((r) => r.subjects && r.subjects.length > 0).length;
    const totalSubjects = rows.reduce((acc, r) => acc + (r.subjects ? r.subjects.length : 0), 0);
    const classesCount = activeTimetable.classes?.length || 0;

    const publishedRecord: PublishedTimetableRecord = {
      id: activeTimetable.id,
      institutionId: instId,
      institutionCode,
      institutionName: activeTimetable.institutionName,
      examinationName: activeTimetable.examinationName,
      timetable: activeTimetable,
      dateRange: computeDateRange(rows),
      totalDays,
      totalSubjects,
      classesCount,
      isActive: true,
      status: 'Active',
      publishedAt: activeTimetable.publishedAt || now,
      updatedAt: now,
    };
    saveLocalPublishedTimetables(instId, [publishedRecord]);

    // Also notify cloud API
    try {
      fetch('/api/published-timetables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timetable: activeTimetable,
          institutionId: instId,
          institutionCode,
          institutionName: activeTimetable.institutionName,
        }),
      }).catch(() => {});
    } catch (_) {}

    // 4. Cloud workspace synchronization
    if (userId && isUUID(userId)) {
      syncUserWorkspaceToDatabase(userId, {
        timetables: nextList,
        activeTimetableId: id,
      }).catch(() => {});
      syncExaminationTimetableToDatabase(activeTimetable, userId).catch(() => {});
    }

    // 5. Broadcast to all active modules and portals immediately
    window.dispatchEvent(
      new CustomEvent('dutyflow:active-timetable-changed', {
        detail: { activeTimetableId: id, timetable: activeTimetable },
      })
    );
    window.dispatchEvent(new Event('dutyflow:published-timetables-change'));

    return { success: true, activeTimetable };
  } catch (err: any) {
    console.error('Error activating timetable:', err);
    return { success: false, error: err?.message || 'Failed to activate timetable.' };
  }
}

/**
 * Deactivates an examination timetable.
 * Requirement 4: Disables the selected examination across all modules and portals.
 * Requirement 7: Does NOT delete existing seating allocations, attendance records or invigilator duties.
 */
export async function deactivateTimetable(
  id: string,
  userId?: string,
  institutionId?: string
): Promise<{ success: boolean; deactivatedTimetable?: ExaminationTimetable; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'Window is not defined' };
  try {
    const listKey = getStorageKey(userId);
    const activeKey = getActiveTimetableStorageKey(userId);
    const existing = getSavedTimetables(userId);
    const target = existing.find((t) => t.id === id);
    if (!target) return { success: false, error: 'Timetable not found' };

    const now = new Date().toISOString();

    const nextList: ExaminationTimetable[] = existing.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          isActive: false,
          status: 'Finalised' as ExaminationStatus, // Retains Finalised status
          updatedAt: now,
        };
      }
      return t;
    });

    const deactivatedTimetable = nextList.find((t) => t.id === id)!;

    // 2. Persist to localStorage
    localStorage.setItem(listKey, JSON.stringify(nextList));
    localStorage.removeItem(activeKey);

    // 3. Clear published operational timetable from Student Portal (disables it on portal)
    const instId = institutionId || userId || 'guest';
    saveLocalPublishedTimetables(instId, []);

    try {
      fetch(`/api/published-timetables?id=${id}&institutionId=${instId}`, {
        method: 'DELETE',
      }).catch(() => {});
    } catch (_) {}

    // 4. Cloud workspace synchronization
    if (userId && isUUID(userId)) {
      syncUserWorkspaceToDatabase(userId, {
        timetables: nextList,
        activeTimetableId: null,
      }).catch(() => {});
      syncExaminationTimetableToDatabase(deactivatedTimetable, userId).catch(() => {});
    }

    // 5. Broadcast deactivation to all modules immediately
    window.dispatchEvent(
      new CustomEvent('dutyflow:active-timetable-changed', {
        detail: { activeTimetableId: null, timetable: null },
      })
    );
    window.dispatchEvent(new Event('dutyflow:published-timetables-change'));

    return { success: true, deactivatedTimetable };
  } catch (err: any) {
    console.error('Error deactivating timetable:', err);
    return { success: false, error: err?.message || 'Failed to deactivate timetable.' };
  }
}

/**
 * Update the status of a timetable: 'Draft' | 'Finalised' | 'Active' | 'Archived'
 */
export function setTimetableStatus(
  id: string,
  status: ExaminationStatus,
  userId?: string
): ExaminationTimetable | null {
  if (typeof window === 'undefined') return null;
  try {
    const listKey = getStorageKey(userId);
    const existing = getSavedTimetables(userId);
    const index = existing.findIndex((t) => t.id === id);
    if (index < 0) return null;

    const current = existing[index];
    const now = new Date().toISOString();

    const updated: ExaminationTimetable = {
      ...current,
      status,
      isActive: status === 'Active',
      isLocked: status === 'Finalised' || status === 'Active' ? true : current.isLocked,
      updatedAt: now,
    };

    existing[index] = updated;
    localStorage.setItem(listKey, JSON.stringify(existing));

    if (status === 'Active') {
      const activeKey = getActiveTimetableStorageKey(userId);
      localStorage.setItem(activeKey, id);
    } else if (current.isActive) {
      const activeKey = getActiveTimetableStorageKey(userId);
      localStorage.removeItem(activeKey);
    }

    if (userId && isUUID(userId)) {
      syncExaminationTimetableToDatabase(updated, userId).catch(() => {});
      syncUserWorkspaceToDatabase(userId, {
        timetables: existing,
        activeTimetableId: status === 'Active' ? id : null,
      }).catch(() => {});
    }

    window.dispatchEvent(
      new CustomEvent('dutyflow:active-timetable-changed', {
        detail: {
          activeTimetableId: status === 'Active' ? id : null,
          timetable: status === 'Active' ? updated : null,
        },
      })
    );

    return updated;
  } catch (err) {
    console.error('Failed to set timetable status:', err);
    return null;
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

    const normalized = normalizeTimetable(timetable);
    const activeId = getActiveTimetableId(userId);
    const isActive = Boolean(timetable.isActive || (activeId && timetable.id === activeId));
    const status = timetable.status || getTimetableEffectiveStatus(normalized, activeId);

    const updated: ExaminationTimetable = {
      ...normalized,
      isActive,
      status,
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
        activeTimetableId: isActive ? updated.id : (activeId || null),
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

    const activeId = getActiveTimetableId(userId);
    if (activeId === id) {
      const activeKey = getActiveTimetableStorageKey(userId);
      localStorage.removeItem(activeKey);
      window.dispatchEvent(
        new CustomEvent('dutyflow:active-timetable-changed', {
          detail: { activeTimetableId: null, timetable: null },
        })
      );
    }

    // Delete from Supabase database
    if (userId && isUUID(userId)) {
      deleteExaminationTimetableFromDatabase(id, userId).catch((err) => {
        console.error('Failed to delete examination timetable from Supabase:', err);
      });
      syncUserWorkspaceToDatabase(userId, {
        timetables: nextList,
        activeTimetableId: activeId === id ? null : undefined,
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

    // Sync activeTimetableId from cloud workspace if present
    const activeKey = getActiveTimetableStorageKey(userId);
    let activeId = localStorage.getItem(activeKey);
    if (!activeId && ws?.activeTimetableId) {
      activeId = ws.activeTimetableId;
      localStorage.setItem(activeKey, activeId);
    }

    const merged = Array.from(map.values())
      .map(normalizeTimetable)
      .map((item) => {
        const isActive = Boolean(activeId && item.id === activeId);
        const status = getTimetableEffectiveStatus(item, activeId);
        return {
          ...item,
          isActive,
          status,
        };
      })
      .sort((a, b) => {
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
  const initialSlot: TimetableSlot = {
    id: 'slot-1',
    course: '1&2 PUC',
    subjects: ['English'],
    timings: {
      [initialClassId]: {
        startTime: '10:00 AM',
        endTime: '01:00 PM',
      },
    },
  };

  const initialRow: TimetableRow = {
    id: 'row-1',
    date: todayIso,
    displayDate: formatDateToDDMMYYYY(todayIso),
    day: getDayFromDate(todayIso),
    course: initialSlot.course,
    subjects: initialSlot.subjects,
    timings: initialSlot.timings,
    slots: [initialSlot],
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
 * Default course options for examination timetable dropdown
 */
export const DEFAULT_COURSE_OPTIONS: string[] = [
  '1 PUC',
  '2 PUC',
  '1&2 PUC',
];

/**
 * Default subject options for multiple selection dropdown
 */
export const DEFAULT_SUBJECT_OPTIONS: string[] = [
  ...STANDARD_STUDENT_SUBJECTS,
];

const PUBLISHED_TIMETABLES_PREFIX = 'dutyflow_published_timetables_';

function getPublishedStorageKey(institutionId?: string): string {
  return `${PUBLISHED_TIMETABLES_PREFIX}${institutionId || 'guest'}`;
}

export function getLocalPublishedTimetables(institutionId?: string): PublishedTimetableRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getPublishedStorageKey(institutionId);
    let raw = localStorage.getItem(key);
    if (!raw && institutionId !== 'guest') {
      raw = localStorage.getItem(getPublishedStorageKey('guest'));
    }
    if (!raw) return [];
    return JSON.parse(raw) as PublishedTimetableRecord[];
  } catch (_) {
    return [];
  }
}

export function saveLocalPublishedTimetables(institutionId: string, list: PublishedTimetableRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getPublishedStorageKey(institutionId);
    localStorage.setItem(key, JSON.stringify(list));
    if (institutionId !== 'guest') {
      localStorage.setItem(getPublishedStorageKey('guest'), JSON.stringify(list));
    }
    window.dispatchEvent(new Event('dutyflow:published-timetables-change'));
  } catch (_) {}
}

/**
 * Publishes an examination timetable to the Student Portal
 */
export async function publishTimetableToStudentPortal(
  timetable: ExaminationTimetable,
  institutionId: string,
  institutionCode?: string
): Promise<{ success: boolean; updatedTimetable?: ExaminationTimetable; error?: string }> {
  try {
    const now = new Date().toISOString();
    const updated: ExaminationTimetable = {
      ...timetable,
      isPublished: true,
      publishedAt: now,
      updatedAt: now,
    };

    // 1. Update saved timetables locally & in central workspace
    saveTimetable(updated, institutionId);

    // 2. Format published record
    const rows = updated.rows || [];
    const totalDays = rows.filter((r) => r.subjects && r.subjects.length > 0).length;
    const totalSubjects = rows.reduce((acc, r) => acc + (r.subjects ? r.subjects.length : 0), 0);
    const classesCount = updated.classes?.length || 0;

    const record: PublishedTimetableRecord = {
      id: updated.id,
      institutionId,
      institutionCode,
      institutionName: updated.institutionName,
      examinationName: updated.examinationName,
      timetable: updated,
      dateRange: computeDateRange(rows),
      totalDays,
      totalSubjects,
      classesCount,
      publishedAt: now,
      updatedAt: now,
    };

    // 3. Save locally
    const existing = getLocalPublishedTimetables(institutionId);
    const idx = existing.findIndex((t) => t.id === updated.id);
    let nextList: PublishedTimetableRecord[];
    if (idx >= 0) {
      nextList = [...existing];
      nextList[idx] = record;
    } else {
      nextList = [record, ...existing];
    }
    saveLocalPublishedTimetables(institutionId, nextList);

    // 4. Send to API / Supabase
    try {
      const res = await fetch('/api/published-timetables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timetable: updated,
          institutionId,
          institutionCode,
          institutionName: updated.institutionName,
        }),
      });

      if (!res.ok) {
        console.warn('Notice: API timetable publish returned non-ok, local published copy preserved');
      }
    } catch (apiErr) {
      console.warn('Notice: Network request for published timetable failed, local copy preserved:', apiErr);
    }

    return { success: true, updatedTimetable: updated };
  } catch (err: any) {
    console.error('Error publishing timetable:', err);
    return { success: false, error: err?.message || 'Failed to publish timetable.' };
  }
}

/**
 * Fetch all published examination timetables for Student Portal
 */
export async function fetchPublishedTimetables(
  institutionId?: string,
  institutionCode?: string
): Promise<PublishedTimetableRecord[]> {
  const localList = getLocalPublishedTimetables(institutionId);

  try {
    const params = new URLSearchParams({
      institutionId: institutionId || '',
      institutionCode: institutionCode || '',
      _t: String(Date.now()),
    });

    const res = await fetch(`/api/published-timetables?${params.toString()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.timetables) && json.timetables.length > 0) {
        if (institutionId) {
          saveLocalPublishedTimetables(institutionId, json.timetables);
        }
        return json.timetables;
      }
    }
  } catch (err) {
    console.warn('Could not fetch published timetables from API, using local cache:', err);
  }

  return localList;
}

/**
 * Unpublishes an examination timetable from Student Portal
 */
export async function unpublishTimetableFromStudentPortal(
  timetableId: string,
  institutionId: string
): Promise<boolean> {
  try {
    const existing = getLocalPublishedTimetables(institutionId);
    const filtered = existing.filter((t) => t.id !== timetableId);
    saveLocalPublishedTimetables(institutionId, filtered);

    try {
      await fetch(`/api/published-timetables?id=${timetableId}&institutionId=${institutionId}`, {
        method: 'DELETE',
      });
    } catch (_) {}

    return true;
  } catch (_) {
    return false;
  }
}
