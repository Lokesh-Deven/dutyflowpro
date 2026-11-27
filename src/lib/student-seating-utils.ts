import { StudentSubject, StudentRecord, SeatingAllocationRecord } from './student-seating-types';

/**
 * Normalizes class strings to canonical forms ('1 PUC', '2 PUC', etc.)
 */
export function normalizeClassName(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (
    upper === '1PUC' ||
    upper === 'IPUC' ||
    upper === '1' ||
    upper === '1STPUC' ||
    upper.includes('1PUC') ||
    upper.includes('CLASS11') ||
    upper.includes('11TH')
  ) {
    return '1 PUC';
  }
  if (
    upper === '2PUC' ||
    upper === 'IIPUC' ||
    upper === '2' ||
    upper === '2NDPUC' ||
    upper.includes('2PUC') ||
    upper.includes('CLASS12') ||
    upper.includes('12TH')
  ) {
    return '2 PUC';
  }
  return trimmed;
}

/**
 * Returns true if the course/class indicates combined multiple classes (e.g. 1 & 2 PUC, Both)
 */
export function isBothOrMultiClass(raw?: string | null): boolean {
  if (!raw) return false;
  const upper = raw.toUpperCase().replace(/\s+/g, '');
  return upper.includes('1&2') || upper.includes('1AND2') || upper.includes('BOTH') || (upper.includes('1') && upper.includes('2'));
}

/**
 * Cleans subject title by removing class prefixes/suffixes and punctuation for clean matching.
 */
export function cleanSubjectTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\b(1\s*PUC|2\s*PUC|I\s*PUC|II\s*PUC|1ST\s*PUC|2ND\s*PUC|CLASS\s*11|CLASS\s*12|11TH|12TH)\b/gi, '')
    .replace(/[()[\]\-:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Extracts class from subject title if embedded (e.g. "1 PUC Accountancy" -> "1 PUC")
 */
export function extractClassFromSubjectTitle(title: string): string {
  if (!title) return '';
  const upper = title.toUpperCase();
  if (/\b(1\s*PUC|I\s*PUC|1ST\s*PUC|CLASS\s*11|11TH)\b/i.test(upper)) {
    return '1 PUC';
  }
  if (/\b(2\s*PUC|II\s*PUC|2ND\s*PUC|CLASS\s*12|12TH)\b/i.test(upper)) {
    return '2 PUC';
  }
  return '';
}

/**
 * Resolves the class name for a subject (e.g., '1 PUC', '2 PUC').
 * Inspects subj.code, subj.name, and student roll numbers/sections.
 */
export function resolveSubjectClass(subj: StudentSubject, students: StudentRecord[] = []): string {
  const rawCode = (subj.code || '').trim();
  if (rawCode) {
    const upper = rawCode.toUpperCase().replace(/\s+/g, '');
    if (
      upper === '1PUC' ||
      upper === 'IPUC' ||
      upper === '1' ||
      upper === '1STPUC' ||
      upper.includes('1PUC') ||
      upper.includes('CLASS11') ||
      upper.includes('11TH')
    ) {
      return '1 PUC';
    }
    if (
      upper === '2PUC' ||
      upper === 'IIPUC' ||
      upper === '2' ||
      upper === '2NDPUC' ||
      upper.includes('2PUC') ||
      upper.includes('CLASS12') ||
      upper.includes('12TH')
    ) {
      return '2 PUC';
    }
    return rawCode;
  }

  const nameUpper = subj.name.toUpperCase();
  if (nameUpper.includes('1 PUC') || nameUpper.includes('1ST PUC') || nameUpper.includes('I PUC') || nameUpper.includes('CLASS 11')) {
    return '1 PUC';
  }
  if (nameUpper.includes('2 PUC') || nameUpper.includes('2ND PUC') || nameUpper.includes('II PUC') || nameUpper.includes('CLASS 12')) {
    return '2 PUC';
  }

  if (students && students.length > 0) {
    let count1 = 0;
    let count2 = 0;
    for (const st of students.slice(0, 30)) {
      const sec = (st.section || '').trim().toUpperCase();
      const roll = (st.rollNo || '').trim().toUpperCase();
      if (sec.startsWith('1') || roll.startsWith('1')) count1++;
      if (sec.startsWith('2') || roll.startsWith('2')) count2++;
    }
    if (count1 > count2 && count1 >= 2) return '1 PUC';
    if (count2 > count1 && count2 >= 2) return '2 PUC';
  }

  return 'General / Unassigned';
}

/**
 * Determines whether a given database subject matches a timetable exam subject entry
 * using a COMPOSITE KEY of (Class + Subject Title).
 */
export function isSubjectMatchingExamSlot(
  subj: StudentSubject,
  subjStudents: StudentRecord[] = [],
  examSubjectName: string,
  slotClass?: string | null
): boolean {
  const cleanSubjName = cleanSubjectTitle(subj.name);
  const cleanExamSubjName = cleanSubjectTitle(examSubjectName);
  const rawSubjNameLower = subj.name.trim().toLowerCase();
  const rawExamSubjNameLower = examSubjectName.trim().toLowerCase();

  // 1. Title Matching Check
  const titleMatches =
    cleanSubjName === cleanExamSubjName ||
    rawSubjNameLower === rawExamSubjNameLower ||
    (subj.code && cleanSubjectTitle(subj.code) === cleanExamSubjName) ||
    (cleanSubjName.length > 3 && cleanExamSubjName.length > 3 && (cleanSubjName.includes(cleanExamSubjName) || cleanExamSubjName.includes(cleanSubjName)));

  if (!titleMatches) {
    return false;
  }

  // 2. Class Resolution for the Database Subject
  const subjectResolvedClass = resolveSubjectClass(subj, subjStudents);
  const normalizedSubjClass = normalizeClassName(subjectResolvedClass);

  // 3. Class Resolution for the Target Exam Session / Slot
  const embeddedExamSubjectClass = extractClassFromSubjectTitle(examSubjectName);
  const effectiveSlotClass = embeddedExamSubjectClass || slotClass || '';

  // If slot class is not specified or general, fallback to title match
  if (!effectiveSlotClass || effectiveSlotClass.trim() === '') {
    return true;
  }

  // If slot is for BOTH / 1 & 2 PUC, then both 1 PUC and 2 PUC subjects match
  if (isBothOrMultiClass(effectiveSlotClass)) {
    return true;
  }

  // Exact composite class check
  const normalizedSlotClass = normalizeClassName(effectiveSlotClass);
  if (normalizedSlotClass === '1 PUC' || normalizedSlotClass === '2 PUC') {
    return normalizedSubjClass === normalizedSlotClass;
  }

  // For any custom class name (e.g. 'Degree', 'Commerce', etc.)
  return normalizedSubjClass.toLowerCase() === normalizedSlotClass.toLowerCase();
}

/**
 * Normalizes any date representation (Date, YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY) to canonical YYYY-MM-DD.
 */
export function normalizeDateToCanonical(dateVal?: Date | string | null): string {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return '';
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(dateVal).trim();
  if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length === 3) {
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const m = parts[1].padStart(2, '0');
      const d = parts[0].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  const iso = str.split('T')[0];
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return str;
}

/**
 * Normalizes a time string (e.g., '10:00 AM', '1:00 PM', '01:00 PM', '13:00') into total minutes from midnight.
 */
export function normalizeTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();
  if (clean === '-' || clean === '') return null;

  const match12 = clean.match(/^(\d{1,2})[:\.](\d{2})\s*(AM|PM)?$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const p = match12[3];
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  return null;
}

export interface MatchAllocationInput {
  sessionDate: Date | string;
  startTime?: string;
  endTime?: string;
  subjectTitle: string;
  course?: string;
  examId?: string;
  allocations: SeatingAllocationRecord[];
  studentSubjects?: StudentSubject[];
}

export interface MatchAllocationResult {
  roomCount: number;
  roomNumbers: string[];
  allocationId?: string;
}

/**
 * Matches a duty row to a Seating Allocation Record using a STRICT COMPOSITE KEY:
 * Date + Exam Timing + Subject (+ Class).
 * Prevents duplicate or incorrect room selections across different dates, times, or classes.
 */
export function matchSeatingAllocationDetails(input: MatchAllocationInput): MatchAllocationResult {
  const {
    sessionDate,
    startTime,
    endTime,
    subjectTitle,
    course,
    examId,
    allocations,
    studentSubjects = [],
  } = input;

  if (!allocations || allocations.length === 0) {
    return { roomCount: 0, roomNumbers: [] };
  }

  const targetDate = normalizeDateToCanonical(sessionDate);
  if (!targetDate) {
    return { roomCount: 0, roomNumbers: [] };
  }

  const targetStartMin = normalizeTimeToMinutes(startTime);
  const targetEndMin = normalizeTimeToMinutes(endTime);

  const cleanDutySubj = cleanSubjectTitle(subjectTitle);
  const dutyClass = extractClassFromSubjectTitle(subjectTitle) || normalizeClassName(course);

  const dutyTokens = (subjectTitle || '')
    .toLowerCase()
    .split(/[\s,\/&\-_+()]+/)
    .map((s) => cleanSubjectTitle(s))
    .filter((s) => s.length > 2);

  interface ScoredAlloc {
    alloc: SeatingAllocationRecord;
    score: number;
    roomNumbers: string[];
    roomCount: number;
  }

  const scoredCandidates: ScoredAlloc[] = [];

  for (const alloc of allocations) {
    // 1. DATE CHECK (MANDATORY - Date must match exactly)
    const allocDate = normalizeDateToCanonical(alloc.examination?.date);
    if (!allocDate || allocDate !== targetDate) {
      continue;
    }

    // 2. TIMING CHECK (MANDATORY - When timing is specified on both, times must match)
    const allocStartMin = normalizeTimeToMinutes(alloc.examination?.startTime);
    const allocEndMin = normalizeTimeToMinutes(alloc.examination?.endTime);

    if (targetStartMin !== null && allocStartMin !== null) {
      const startDiff = Math.abs(targetStartMin - allocStartMin);
      // If difference is greater than 35 minutes, they are different examination sessions (e.g. 10:00 AM vs 1:00 PM)
      if (startDiff > 35) {
        continue;
      }
    }

    // 3. SUBJECT & CLASS CHECK
    const allocSubjs = (alloc.subjectIds || []).map((sid) => {
      const found = studentSubjects.find((s) => s.id === sid);
      return {
        id: sid,
        name: found ? found.name : sid,
        class: found ? resolveSubjectClass(found) : '',
        code: found ? found.code : '',
      };
    });

    (alloc.subjectStats || []).forEach((st) => {
      if (!allocSubjs.some((s) => s.id === st.subjectId)) {
        allocSubjs.push({
          id: st.subjectId,
          name: st.subjectName,
          class: '',
          code: '',
        });
      }
    });

    const allocExamName = (alloc.name || alloc.examination?.examName || '').toLowerCase();

    // Check Class Conflict (1 PUC vs 2 PUC)
    if (dutyClass === '1 PUC' || dutyClass === '2 PUC') {
      const hasDirectClassConflict = allocSubjs.some((as) => {
        const asNorm = normalizeClassName(as.class || as.code);
        return (dutyClass === '1 PUC' && asNorm === '2 PUC') || (dutyClass === '2 PUC' && asNorm === '1 PUC');
      });
      if (hasDirectClassConflict && !allocSubjs.some((as) => normalizeClassName(as.class || as.code) === dutyClass)) {
        continue; // Disqualified: Conflicting class
      }
    }

    // Check Subject Match
    const hasExactSubjMatch = allocSubjs.some((as) => {
      const asClean = cleanSubjectTitle(as.name);
      return (
        asClean === cleanDutySubj ||
        as.name.trim().toLowerCase() === subjectTitle.trim().toLowerCase() ||
        (cleanDutySubj.length > 3 && asClean.includes(cleanDutySubj)) ||
        (asClean.length > 3 && cleanDutySubj.includes(asClean))
      );
    });

    const hasTokenSubjMatch = dutyTokens.some((tok) =>
      allocSubjs.some((as) => cleanSubjectTitle(as.name).includes(tok) || tok.includes(cleanSubjectTitle(as.name))) ||
      allocExamName.includes(tok)
    );

    if (!hasExactSubjMatch && !hasTokenSubjMatch && cleanDutySubj.length > 0) {
      continue; // Disqualified: Subject does not match
    }

    // Calculate match confidence score
    let score = 20; // Date matched

    if (targetStartMin !== null && allocStartMin !== null && Math.abs(targetStartMin - allocStartMin) <= 15) {
      score += 30; // Exact/close timing matched
    }
    if (targetEndMin !== null && allocEndMin !== null && Math.abs(targetEndMin - allocEndMin) <= 20) {
      score += 10;
    }

    if (hasExactSubjMatch) {
      score += 40; // Exact subject matched
    } else if (hasTokenSubjMatch) {
      score += 20;
    }

    if (dutyClass && allocSubjs.some((as) => normalizeClassName(as.class || as.code) === dutyClass)) {
      score += 25; // Exact class matched
    }

    if (alloc.examination?.examId && examId && (alloc.examination.examId === examId || examId.startsWith(alloc.examination.examId))) {
      score += 50; // Direct session ID matched
    }

    const roomNumbers = (alloc.roomPlans || []).map((rp) => rp.roomNo).filter(Boolean);
    const roomCount = alloc.roomPlans?.length || alloc.summary?.totalRooms || alloc.roomIds?.length || 0;

    scoredCandidates.push({
      alloc,
      score,
      roomNumbers,
      roomCount,
    });
  }

  if (scoredCandidates.length === 0) {
    return { roomCount: 0, roomNumbers: [] };
  }

  // Sort candidates by highest score
  scoredCandidates.sort((a, b) => b.score - a.score);
  const best = scoredCandidates[0];

  return {
    roomCount: best.roomCount,
    roomNumbers: best.roomNumbers,
    allocationId: best.alloc.id,
  };
}

/**
 * Backward-compatible helper to find matching allocation rooms using the composite key.
 */
export function findMatchingAllocationRooms(
  inputOrDate: MatchAllocationInput | Date | string,
  subjectTitle?: string,
  allocations?: SeatingAllocationRecord[],
  studentSubjects?: StudentSubject[],
  startTime?: string,
  endTime?: string,
  course?: string,
  examId?: string
): number {
  if (typeof inputOrDate === 'object' && !(inputOrDate instanceof Date) && 'subjectTitle' in inputOrDate) {
    return matchSeatingAllocationDetails(inputOrDate).roomCount;
  }

  return matchSeatingAllocationDetails({
    sessionDate: inputOrDate,
    subjectTitle: subjectTitle || '',
    allocations: allocations || [],
    studentSubjects: studentSubjects || [],
    startTime,
    endTime,
    course,
    examId,
  }).roomCount;
}

