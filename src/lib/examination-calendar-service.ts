import {
  ExaminationScheduleItem,
  ExaminationConflict,
  ExaminationDateType,
} from './examination-calendar-types';

export const DEFAULT_EXAMINATION_NAMES: string[] = [
  'First Test',
  'Second Test',
  'Mid-Term Examination',
  'Preparatory Examination',
  'Annual Examination',
  'Unit Test 1',
  'Unit Test 2',
  'Semester Examination',
  'Practical Examination',
  'Special Examination',
];

export function getDefaultSlots(
  institutionId: string = 'default',
  institutionCode: string = '',
  count: number = 1
): ExaminationScheduleItem[] {
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const slotNumber = index + 1;
    return {
      slot_number: slotNumber,
      exam_name: '',
      start_date: '',
      end_date: '',
      total_marks: '',
      date_type: 'tentative',
      publication_status: 'draft',
      tentative_start_date: null,
      tentative_end_date: null,
      published_at: null,
      institution_id: institutionId,
      institution_code: institutionCode,
    };
  });
}

export function getStorageKey(institutionId: string = 'default'): string {
  return `dutyflow_examination_calendar_${institutionId || 'default'}`;
}

export function getLocalExaminationCalendar(
  institutionId: string = 'default',
  institutionCode: string = ''
): ExaminationScheduleItem[] {
  if (typeof window === 'undefined') return getDefaultSlots(institutionId, institutionCode, 1);
  try {
    let raw = localStorage.getItem(getStorageKey(institutionId));
    if (!raw && institutionId !== 'guest-session') {
      raw = localStorage.getItem(getStorageKey('guest-session'));
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any, idx: number) => ({
          ...item,
          slot_number: typeof item.slot_number === 'number' ? item.slot_number : idx + 1,
          institution_id: institutionId,
          institution_code: institutionCode || item.institution_code,
        }));
      }
    }
  } catch (_) {}
  return getDefaultSlots(institutionId, institutionCode, 1);
}

export function saveLocalExaminationCalendar(
  institutionId: string = 'default',
  items: ExaminationScheduleItem[]
): void {
  if (typeof window === 'undefined') return;
  try {
    const jsonStr = JSON.stringify(items);
    localStorage.setItem(getStorageKey(institutionId), jsonStr);
    if (institutionId !== 'guest-session') {
      localStorage.setItem(getStorageKey('guest-session'), jsonStr);
    }
    window.dispatchEvent(new Event('dutyflow:examination-calendar-change'));
  } catch (_) {}
}

export function detectExaminationConflicts(
  target: ExaminationScheduleItem,
  allSlots: ExaminationScheduleItem[]
): ExaminationConflict[] {
  const conflicts: ExaminationConflict[] = [];

  const start = (target.start_date || '').trim();
  const end = (target.end_date || '').trim();

  if (!start || !end) return conflicts;

  const targetStart = new Date(start).getTime();
  const targetEnd = new Date(end).getTime();

  if (isNaN(targetStart) || isNaN(targetEnd) || targetStart > targetEnd) {
    return conflicts;
  }

  for (const slot of allSlots) {
    if (slot.slot_number === target.slot_number) continue;

    const slotStart = (slot.start_date || '').trim();
    const slotEnd = (slot.end_date || '').trim();

    if (!slotStart || !slotEnd) continue;

    const s = new Date(slotStart).getTime();
    const e = new Date(slotEnd).getTime();

    if (isNaN(s) || isNaN(e) || s > e) continue;

    // Standard interval overlap condition: targetStart <= e && targetEnd >= s
    if (targetStart <= e && targetEnd >= s) {
      conflicts.push({
        conflictingSlot: slot.slot_number,
        conflictingExamName: slot.exam_name,
        conflictingStartDate: slot.start_date,
        conflictingEndDate: slot.end_date,
      });
    }
  }

  return conflicts;
}

export async function fetchExaminationCalendarApi(
  institutionId: string,
  institutionCode: string = '',
  role: 'admin' | 'student' = 'admin'
): Promise<ExaminationScheduleItem[]> {
  try {
    const params = new URLSearchParams({
      institutionId: institutionId || '',
      institutionCode: institutionCode || '',
      role,
      _t: String(Date.now()), // Cache-buster
    });

    const res = await fetch(`/api/examination-calendar?${params.toString()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        if (typeof window !== 'undefined') {
          saveLocalExaminationCalendar(institutionId, json.data);
        }
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Could not fetch examination calendar from API, using local fallback:', err);
  }

  return getLocalExaminationCalendar(institutionId, institutionCode);
}

export async function saveExaminationCalendarApi(
  institutionId: string,
  institutionCode: string = '',
  items: ExaminationScheduleItem[],
  deletedSlotNumber?: number
): Promise<boolean> {
  // Always update local cache first
  saveLocalExaminationCalendar(institutionId, items);

  try {
    const res = await fetch('/api/examination-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institutionId,
        institutionCode,
        items,
        deletedSlotNumber,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
  } catch (err) {
    console.warn('Error syncing examination calendar with API:', err);
  }

  return true;
}

