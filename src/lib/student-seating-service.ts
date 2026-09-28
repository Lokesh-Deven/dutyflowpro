import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { isUUID } from './storage-service';
import {
  SeatingMasterRoom,
  StudentSubject,
  StudentRecord,
  SeatingAllocationRecord,
  StudentDataValidationResult,
} from './student-seating-types';

export const DEFAULT_STUDENT_ROOMS: SeatingMasterRoom[] = [
  {
    id: 'room-101',
    roomNo: '101',
    leftBenches: 10,
    rightBenches: 10,
    totalBenches: 20,
    capacityOne: 20,
    capacityTwo: 40,
    capacityThree: 60,
    status: 'Available',
  },
  {
    id: 'room-102',
    roomNo: '102',
    leftBenches: 10,
    rightBenches: 10,
    totalBenches: 20,
    capacityOne: 20,
    capacityTwo: 40,
    capacityThree: 60,
    status: 'Available',
  },
  {
    id: 'room-103',
    roomNo: '103',
    leftBenches: 8,
    rightBenches: 8,
    totalBenches: 16,
    capacityOne: 16,
    capacityTwo: 32,
    capacityThree: 48,
    status: 'Available',
  },
  {
    id: 'room-104',
    roomNo: '104',
    leftBenches: 12,
    rightBenches: 12,
    totalBenches: 24,
    capacityOne: 24,
    capacityTwo: 48,
    capacityThree: 72,
    status: 'Available',
  },
];

/**
 * Standard examination subjects sorted in alphabetical order
 */
export const STANDARD_STUDENT_SUBJECTS = [
  'Accountancy',
  'Basic Mathematics',
  'Biology',
  'Business Studies',
  'Chemistry',
  'Computer Science',
  'Economics',
  'Education',
  'Electronics',
  'English',
  'Geography',
  'Geology',
  'Hindi',
  'History',
  'Kannada',
  'Logic',
  'Mathematics',
  'Physics',
  'Political Science',
  'Psychology',
  'Sanskrit',
  'Sociology',
  'Statistics',
] as const;

export const STANDARD_SUBJECT_CODES: Record<string, string> = {
  'Accountancy': 'ACC',
  'Basic Mathematics': 'BMT',
  'Biology': 'BIO',
  'Business Studies': 'BST',
  'Chemistry': 'CHM',
  'Computer Science': 'CSC',
  'Economics': 'ECO',
  'Education': 'EDU',
  'Electronics': 'ELE',
  'English': 'ENG',
  'Geography': 'GEO',
  'Geology': 'GEL',
  'Hindi': 'HIN',
  'History': 'HIS',
  'Kannada': 'KAN',
  'Logic': 'LOG',
  'Mathematics': 'MAT',
  'Physics': 'PHY',
  'Political Science': 'POL',
  'Psychology': 'PSY',
  'Sanskrit': 'SAN',
  'Sociology': 'SOC',
  'Statistics': 'STA',
};

export const DEFAULT_STUDENT_SUBJECTS: StudentSubject[] = [
  { id: 'subj-phy', name: 'Physics', code: 'PHY101', expectedStudents: 200, uploadedStudentsCount: 0 },
  { id: 'subj-chem', name: 'Chemistry', code: 'CHM101', expectedStudents: 200, uploadedStudentsCount: 0 },
  { id: 'subj-acc', name: 'Accountancy', code: 'ACC101', expectedStudents: 350, uploadedStudentsCount: 0 },
  { id: 'subj-eng', name: 'English', code: 'ENG101', expectedStudents: 650, uploadedStudentsCount: 0 },
];

/**
 * Excel File Validation & Parser for Student Data
 * Expected Columns: Sl No, Name, Section, Roll No
 */
export async function validateAndParseStudentExcel(
  file: File,
  subjectId: string,
  expectedCount: number = 0
): Promise<StudentDataValidationResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return {
      expectedCount,
      totalRows: 0,
      validRecords: [],
      errors: [{ row: 0, reason: 'Empty Excel file: No sheets found.' }],
      duplicates: [],
      isValid: false,
    };
  }

  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1, defval: '' });

  if (jsonData.length < 2) {
    return {
      expectedCount,
      totalRows: 0,
      validRecords: [],
      errors: [{ row: 1, reason: 'Excel file must contain a header row and at least one student record.' }],
      duplicates: [],
      isValid: false,
    };
  }

  // Intelligent Header Row Detection (scans rows 0-15 for real column headers)
  const isNameHeader = (h: string) =>
    (h.includes('name') || h.includes('student') || h.includes('candidate') || h.includes('pupil')) &&
    !h.includes('college') && !h.includes('school') && !h.includes('exam') && !h.includes('inst');

  const isRollHeader = (h: string) =>
    (h.includes('roll') || h.includes('reg') || h.includes('usn') || h.includes('hall') || h.includes('seat') ||
     h.includes('prn') || h.includes('urn') || h.includes('adm') || h.includes('enroll') || h.includes('id')) &&
    !h.includes('sl') && !h.includes('s.') && !h.includes('serial');

  const isSecHeader = (h: string) =>
    h.includes('sec') || h.includes('class') || h.includes('div') || h.includes('branch') || h.includes('group') || h.includes('stream');

  let headerRowIdx = -1;
  let nameColIdx = -1;
  let secColIdx = -1;
  let rollColIdx = -1;

  for (let r = 0; r < Math.min(jsonData.length, 15); r++) {
    const row = jsonData[r] as any[];
    if (!Array.isArray(row) || row.length === 0) continue;
    const rawHeaders = row.map((h) => String(h || '').trim().toLowerCase());

    const nIdx = rawHeaders.findIndex(isNameHeader);
    const rIdx = rawHeaders.findIndex(isRollHeader);
    const sIdx = rawHeaders.findIndex(isSecHeader);

    if (nIdx !== -1 && rIdx !== -1) {
      headerRowIdx = r;
      nameColIdx = nIdx;
      rollColIdx = rIdx;
      secColIdx = sIdx;
      break;
    }
  }

  // Fallback 1: Check row 0 with relaxed keyword matching
  if (headerRowIdx === -1) {
    const rawHeaders = (jsonData[0] as any[]).map((h) => String(h || '').trim().toLowerCase());
    nameColIdx = rawHeaders.findIndex((h) => h.includes('name') || h.includes('student'));
    rollColIdx = rawHeaders.findIndex((h) => (h.includes('roll') || h.includes('reg') || h.includes('usn') || h.includes('id') || h.includes('seat')) && !h.includes('sl'));
    secColIdx = rawHeaders.findIndex((h) => h.includes('sec') || h.includes('class'));
    if (nameColIdx !== -1 && rollColIdx !== -1) {
      headerRowIdx = 0;
    }
  }

  // Fallback 2: If standard column layout without recognized headers
  if (headerRowIdx === -1) {
    headerRowIdx = 0;
    const firstRowLen = (jsonData[0] as any[]).length;
    if (firstRowLen >= 4) {
      nameColIdx = 1;
      secColIdx = 2;
      rollColIdx = 3;
    } else if (firstRowLen >= 2) {
      rollColIdx = 0;
      nameColIdx = 1;
      secColIdx = firstRowLen > 2 ? 2 : -1;
    } else {
      return {
        expectedCount,
        totalRows: 0,
        validRecords: [],
        errors: [
          {
            row: 1,
            reason: `Required columns missing. Expected 'Name', 'Section', 'Roll No'. Found headers: ${(jsonData[0] as any[]).join(', ')}`,
          },
        ],
        duplicates: [],
        isValid: false,
      };
    }
  }

  const validRecords: StudentRecord[] = [];
  const errors: { row: number; reason: string }[] = [];
  const rollMap = new Map<string, number>();

  for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0 || row.every((c) => String(c || '').trim() === '')) {
      continue; // Skip empty rows
    }

    const rowNum = i + 1;
    const name = String(row[nameColIdx] || '').trim();
    const section = secColIdx !== -1 ? String(row[secColIdx] || '').trim() : 'A';
    const rawRoll = String(row[rollColIdx] || '').trim();
    // Sanitize numeric roll numbers from Excel (e.g. 101.0 -> 101)
    const rollNo = rawRoll.replace(/\.0$/, '');

    if (!name) {
      errors.push({ row: rowNum, reason: `Row ${rowNum}: Student Name is blank.` });
      continue;
    }

    if (!rollNo) {
      errors.push({ row: rowNum, reason: `Row ${rowNum}: Roll Number is blank.` });
      continue;
    }

    // Duplicate check
    const existingCount = rollMap.get(rollNo) || 0;
    rollMap.set(rollNo, existingCount + 1);

    validRecords.push({
      id: `std-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
      subjectId,
      name,
      section: section || 'A',
      rollNo,
      createdAt: new Date().toISOString(),
    });
  }

  const duplicates: { rollNo: string; count: number }[] = [];
  rollMap.forEach((count, rollNo) => {
    if (count > 1) {
      duplicates.push({ rollNo, count });
      errors.push({ row: 0, reason: `Duplicate Roll Number detected: '${rollNo}' appears ${count} times.` });
    }
  });

  const totalRows = validRecords.length + errors.filter((e) => e.row > 0).length;
  const isValid = errors.length === 0 && validRecords.length > 0;

  let warning: string | undefined = undefined;
  if (expectedCount > 0 && validRecords.length !== expectedCount) {
    const diff = Math.abs(expectedCount - validRecords.length);
    warning = `Warning: Expected ${expectedCount} students, but uploaded ${validRecords.length} records (${diff > 0 ? (validRecords.length > expectedCount ? `+${diff} excess` : `-${diff} shortage`) : ''}).`;
  }

  return {
    expectedCount,
    totalRows,
    validRecords,
    errors,
    duplicates,
    isValid,
    warning,
  };
}

/**
 * Permanently save seating master rooms to Supabase cloud for the authenticated user.
 * Stores in Supabase Auth user metadata and the profiles table.
 */
export async function saveSeatingRoomsToCloud(
  rooms: SeatingMasterRoom[],
  userId: string
): Promise<{ success: boolean; error?: any }> {
  if (!userId || !isUUID(userId)) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    // 1. Update auth user metadata (guaranteed persistence across all logins)
    try {
      await supabase.auth.updateUser({
        data: {
          seating_master_rooms: rooms,
          seating_master_rooms_updated_at: new Date().toISOString(),
        },
      });
    } catch (metaErr) {
      console.warn('Could not update seating_master_rooms in auth metadata:', metaErr);
    }

    // 2. Also try updating profiles table if available
    try {
      await supabase
        .from('profiles')
        .update({
          master_rooms: rooms,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } catch (_) { }

    return { success: true };
  } catch (err: any) {
    console.error('Exception in saveSeatingRoomsToCloud:', err);
    return { success: false, error: err };
  }
}

/**
 * Fetch cloud-saved seating master rooms for the specified user from Supabase.
 */
export async function fetchSeatingRoomsFromCloud(
  userId: string
): Promise<SeatingMasterRoom[] | null> {
  if (!userId || !isUUID(userId)) return null;

  try {
    // 1. Check current authenticated user's metadata first
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.user_metadata?.seating_master_rooms) {
      const metaRooms = userData.user.user_metadata.seating_master_rooms;
      if (Array.isArray(metaRooms) && metaRooms.length > 0) {
        return metaRooms;
      }
    }

    // 2. Fallback to profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('master_rooms')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data && Array.isArray((data as any).master_rooms) && (data as any).master_rooms.length > 0) {
      return (data as any).master_rooms;
    }

    return null;
  } catch (err) {
    console.error('Exception in fetchSeatingRoomsFromCloud:', err);
    return null;
  }
}
