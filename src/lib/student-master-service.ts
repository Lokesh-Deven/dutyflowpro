import * as XLSX from 'xlsx';
import { idbGet, idbSet } from './idb-storage';
import { StudentMasterProfile, BulkUploadParseResult, BulkPhotoMatchResult } from './student-master-types';

export const DEMO_STUDENT_PROFILES: StudentMasterProfile[] = [
  {
    id: 'std-24pu-0101',
    name: 'Aarav Patel',
    registerNumber: '24PU0101',
    satsNumber: 'SATS10884920',
    className: '1PUC',
    stream: 'Science',
    combination: 'PCMB',
    dob: '2008-05-14',
    gender: 'Male',
    fatherName: 'Rajesh Patel',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'std-24pu-0102',
    name: 'Ananya Sharma',
    registerNumber: '24PU0102',
    satsNumber: 'SATS10884921',
    className: '1PUC',
    stream: 'Science',
    combination: 'PCMB',
    dob: '2008-09-22',
    gender: 'Female',
    fatherName: 'Mahesh Sharma',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'std-24pu-0103',
    name: 'Bhavya Rao',
    registerNumber: '24PU0103',
    satsNumber: 'SATS10884922',
    className: '1PUC',
    stream: 'Science',
    combination: 'PCMC',
    dob: '2008-01-30',
    gender: 'Female',
    fatherName: 'Suresh Rao',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'std-24pu-0104',
    name: 'Chirag Mehta',
    registerNumber: '24PU0104',
    satsNumber: 'SATS10884923',
    className: '1PUC',
    stream: 'Science',
    combination: 'PCMC',
    dob: '2008-11-12',
    gender: 'Male',
    fatherName: 'Kishore Mehta',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'std-24pu-0201',
    name: 'Deepak Kumar',
    registerNumber: '24PU0201',
    satsNumber: 'SATS10884930',
    className: '1PUC',
    stream: 'Commerce',
    combination: 'CEBA',
    dob: '2008-03-18',
    gender: 'Male',
    fatherName: 'Gopal Kumar',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'std-24pu-0202',
    name: 'Divya Reddy',
    registerNumber: '24PU0202',
    satsNumber: 'SATS10884931',
    className: '1PUC',
    stream: 'Commerce',
    combination: 'CEBA',
    dob: '2008-07-25',
    gender: 'Female',
    fatherName: 'Venkat Reddy',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'std-23pu-0101',
    name: 'Eshwar Murthy',
    registerNumber: '23PU0101',
    satsNumber: 'SATS10773810',
    className: '2PUC',
    stream: 'Science',
    combination: 'PCMB',
    dob: '2007-04-10',
    gender: 'Male',
    fatherName: 'Narayana Murthy',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'std-23pu-0102',
    name: 'Farhan Khan',
    registerNumber: '23PU0102',
    satsNumber: 'SATS10773811',
    className: '2PUC',
    stream: 'Science',
    combination: 'PCMC',
    dob: '2007-08-15',
    gender: 'Male',
    fatherName: 'Abdul Khan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'std-23pu-0201',
    name: 'Gowri Shankar',
    registerNumber: '23PU0201',
    satsNumber: 'SATS10773820',
    className: '2PUC',
    stream: 'Commerce',
    combination: 'CEBA',
    dob: '2007-02-05',
    gender: 'Female',
    fatherName: 'Shankar Gowda',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'std-23pu-0202',
    name: 'Harish Varma',
    registerNumber: '23PU0202',
    satsNumber: 'SATS10773821',
    className: '2PUC',
    stream: 'Commerce',
    combination: 'SEBA',
    dob: '2007-12-01',
    gender: 'Male',
    fatherName: 'Prasad Varma',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'std-23pu-0301',
    name: 'Isha Nair',
    registerNumber: '23PU0301',
    satsNumber: 'SATS10773830',
    className: '2PUC',
    stream: 'Arts',
    combination: 'HEBA',
    dob: '2007-06-19',
    gender: 'Female',
    fatherName: 'Ravi Nair',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'std-23pu-0302',
    name: 'Jayant Kulkarni',
    registerNumber: '23PU0302',
    satsNumber: 'SATS10773831',
    className: '2PUC',
    stream: 'Arts',
    combination: 'HEBA',
    dob: '2007-10-08',
    gender: 'Male',
    fatherName: 'Sanjay Kulkarni',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function getProfilesKey(scope: string = 'guest'): string {
  return `dutyflow_${scope}_student_master_profiles`;
}

/**
 * Loads student master profiles from IndexedDB or LocalStorage.
 * If empty, initializes with DEMO_STUDENT_PROFILES.
 */
export async function getStudentMasterProfiles(scope: string = 'guest'): Promise<StudentMasterProfile[]> {
  const key = getProfilesKey(scope);

  // 1. Try IndexedDB
  try {
    const fromIdb = await idbGet<StudentMasterProfile[]>(key);
    if (fromIdb && Array.isArray(fromIdb) && fromIdb.length > 0) {
      return fromIdb;
    }
  } catch (_) {}

  // 2. Try LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sync to IndexedDB in background
          idbSet(key, parsed).catch(() => {});
          return parsed;
        }
      }
    } catch (_) {}
  }

  // 3. Fallback: Initialize with sample profiles for instant administrative preview
  const demo = [...DEMO_STUDENT_PROFILES];
  await saveStudentMasterProfiles(demo, scope);
  return demo;
}

/**
 * Persists student master profiles across IndexedDB and LocalStorage.
 */
export async function saveStudentMasterProfiles(
  profiles: StudentMasterProfile[],
  scope: string = 'guest'
): Promise<void> {
  const key = getProfilesKey(scope);

  // Strip huge photos from localStorage to avoid 5MB quota errors; keep full objects in IndexedDB
  await idbSet(key, profiles);

  if (typeof window !== 'undefined') {
    try {
      // Create a light copy for localStorage without giant base64 image strings if too large
      const lightCopy = profiles.map((p) => {
        if (p.photoUrl && p.photoUrl.length > 2000) {
          return { ...p, photoUrl: '__IDB_SAVED__' };
        }
        return p;
      });
      localStorage.setItem(key, JSON.stringify(lightCopy));
    } catch (_) {
      // LocalStorage exceeded; IndexedDB preserves full data safely
    }
    window.dispatchEvent(new CustomEvent('dutyflow:student-directory-updated'));
  }
}

/**
 * Inserts or updates an individual student master profile.
 */
export async function upsertStudentProfile(
  profile: StudentMasterProfile,
  scope: string = 'guest'
): Promise<StudentMasterProfile[]> {
  const existing = await getStudentMasterProfiles(scope);
  const now = new Date().toISOString();

  const idx = existing.findIndex((p) => p.id === profile.id || p.registerNumber.toUpperCase() === profile.registerNumber.toUpperCase());
  let updatedList: StudentMasterProfile[];

  if (idx !== -1) {
    updatedList = [...existing];
    updatedList[idx] = {
      ...existing[idx],
      ...profile,
      updatedAt: now,
    };
  } else {
    updatedList = [
      {
        ...profile,
        id: profile.id || `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      },
      ...existing,
    ];
  }

  await saveStudentMasterProfiles(updatedList, scope);
  return updatedList;
}

/**
 * Deletes a single student profile.
 */
export async function deleteStudentProfile(
  id: string,
  scope: string = 'guest'
): Promise<StudentMasterProfile[]> {
  const existing = await getStudentMasterProfiles(scope);
  const filtered = existing.filter((p) => p.id !== id);
  await saveStudentMasterProfiles(filtered, scope);
  return filtered;
}

/**
 * Clears all student profiles.
 */
export async function clearStudentProfiles(scope: string = 'guest'): Promise<void> {
  await saveStudentMasterProfiles([], scope);
}

/**
 * Cleans a filename to isolate the register number:
 * e.g. "24PU0101.jpg" -> "24PU0101"
 * e.g. "24PU0101_passport.png" -> "24PU0101"
 * e.g. "IMG_24PU0101.jpeg" -> "24PU0101"
 */
export function extractRegisterNumberFromFileName(fileName: string): string {
  // Strip extension
  const withoutExt = fileName.replace(/\.[^/.]+$/, '').trim();
  // Strip common prefixes and suffixes
  const cleaned = withoutExt
    .replace(/^img[-_]/i, '')
    .replace(/^photo[-_]/i, '')
    .replace(/[-_]photo$/i, '')
    .replace(/[-_]passport$/i, '')
    .replace(/[-_]img$/i, '')
    .trim();

  return cleaned.toUpperCase();
}

/**
 * Maps multiple uploaded image files to student profiles by matching filename with Register Number.
 */
export async function bulkMapStudentPhotos(
  photoFiles: { fileName: string; dataUrl: string }[],
  profiles: StudentMasterProfile[],
  scope: string = 'guest'
): Promise<{
  updatedProfiles: StudentMasterProfile[];
  result: BulkPhotoMatchResult;
}> {
  const updatedProfiles = [...profiles];
  const matchedRegs: string[] = [];
  const unmatchedFiles: string[] = [];

  for (const { fileName, dataUrl } of photoFiles) {
    const extractedReg = extractRegisterNumberFromFileName(fileName);

    // Look for matching student
    const matchIndex = updatedProfiles.findIndex((p) => {
      const reg = p.registerNumber.trim().toUpperCase();
      const sats = (p.satsNumber || '').trim().toUpperCase();
      return reg === extractedReg || sats === extractedReg || extractedReg.includes(reg);
    });

    if (matchIndex !== -1) {
      updatedProfiles[matchIndex] = {
        ...updatedProfiles[matchIndex],
        photoUrl: dataUrl,
        updatedAt: new Date().toISOString(),
      };
      matchedRegs.push(updatedProfiles[matchIndex].registerNumber);
    } else {
      unmatchedFiles.push(fileName);
    }
  }

  await saveStudentMasterProfiles(updatedProfiles, scope);

  return {
    updatedProfiles,
    result: {
      matchedCount: matchedRegs.length,
      unmatchedCount: unmatchedFiles.length,
      matchedRegisterNumbers: matchedRegs,
      unmatchedFileNames: unmatchedFiles,
    },
  };
}

/**
 * Parses an Excel or CSV file containing student master directory records.
 */
export async function parseStudentDirectoryExcel(file: File): Promise<BulkUploadParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return {
      validProfiles: [],
      totalRows: 0,
      duplicateCount: 0,
      errors: [{ row: 0, reason: 'Empty workbook: No sheets found.' }],
    };
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    return {
      validProfiles: [],
      totalRows: 0,
      duplicateCount: 0,
      errors: [{ row: 0, reason: 'File does not contain any data rows.' }],
    };
  }

  // 1. Identify Header Row
  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const candidate = rows[i].map((c) => String(c).toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
    const hasName = candidate.some((c) => c.includes('name') || c.includes('student'));
    const hasReg = candidate.some((c) => c.includes('reg') || c.includes('roll') || c.includes('admission'));

    if (hasName && hasReg) {
      headerIndex = i;
      headers = candidate;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
    headers = rows[0].map((c) => String(c).toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  }

  const findCol = (keywords: string[]): number => {
    return headers.findIndex((h) => keywords.some((kw) => h.includes(kw)));
  };

  const colName = findCol(['studentname', 'fullname', 'name', 'candidatename']);
  const colReg = findCol(['registerno', 'registernumber', 'regno', 'rollno', 'registration', 'hallticketno']);
  const colSats = findCol(['sats', 'satsid', 'satsno', 'admissionno', 'admissionid', 'collegeid']);
  const colClass = findCol(['class', 'course', 'grade', 'standard', 'year']);
  const colStream = findCol(['stream', 'faculty', 'branch']);
  const colComb = findCol(['combination', 'comb', 'subjects', 'group']);
  const colDob = findCol(['dob', 'dateofbirth', 'birthdate']);
  const colGender = findCol(['gender', 'sex']);
  const colFather = findCol(['fathername', 'fathersname', 'parentname', 'father', 'guardian']);

  if (colName === -1 || colReg === -1) {
    return {
      validProfiles: [],
      totalRows: rows.length - (headerIndex + 1),
      duplicateCount: 0,
      errors: [
        {
          row: headerIndex + 1,
          reason: 'Missing mandatory headers: Could not identify "Student Name" or "Register Number" columns.',
        },
      ],
    };
  }

  const validProfiles: StudentMasterProfile[] = [];
  const errors: { row: number; reason: string }[] = [];
  const seenRegs = new Set<string>();
  let duplicateCount = 0;
  const now = new Date().toISOString();

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => String(c).trim() === '')) continue;

    const rawName = String(row[colName] || '').trim();
    const rawReg = String(row[colReg] || '').trim().toUpperCase();

    if (!rawName) {
      errors.push({ row: r + 1, reason: 'Student Name is empty.' });
      continue;
    }

    if (!rawReg) {
      errors.push({ row: r + 1, reason: 'Register Number is empty.' });
      continue;
    }

    if (seenRegs.has(rawReg)) {
      duplicateCount++;
      continue;
    }
    seenRegs.add(rawReg);

    const satsNumber = colSats !== -1 ? String(row[colSats] || '').trim() : undefined;
    const className = colClass !== -1 && String(row[colClass] || '').trim() ? String(row[colClass]).trim().toUpperCase() : '1PUC';
    let stream = colStream !== -1 && String(row[colStream] || '').trim() ? String(row[colStream]).trim() : 'Science';
    let combination = colComb !== -1 && String(row[colComb] || '').trim() ? String(row[colComb]).trim().toUpperCase() : 'PCMB';

    // Normalize stream based on combination if stream wasn't explicitly given
    if (combination.includes('CEBA') || combination.includes('SEBA') || combination.includes('HEBA') || combination.includes('MEBA')) {
      if (!row[colStream]) stream = 'Commerce';
    } else if (combination.includes('PCMB') || combination.includes('PCMC') || combination.includes('PCME')) {
      if (!row[colStream]) stream = 'Science';
    }

    // Format DOB
    let dob: string | undefined = undefined;
    if (colDob !== -1 && row[colDob]) {
      const val = row[colDob];
      if (val instanceof Date && !isNaN(val.getTime())) {
        dob = val.toISOString().split('T')[0];
      } else {
        dob = String(val).trim();
      }
    }

    let gender: string | undefined = undefined;
    if (colGender !== -1 && row[colGender]) {
      const g = String(row[colGender]).trim().toLowerCase();
      if (g.startsWith('m')) gender = 'Male';
      else if (g.startsWith('f')) gender = 'Female';
      else gender = String(row[colGender]).trim();
    }

    const fatherName = colFather !== -1 ? String(row[colFather] || '').trim() || undefined : undefined;

    validProfiles.push({
      id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: rawName,
      registerNumber: rawReg,
      satsNumber: satsNumber || undefined,
      className,
      stream,
      combination,
      dob,
      gender,
      fatherName,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    validProfiles,
    totalRows: rows.length - (headerIndex + 1),
    duplicateCount,
    errors,
  };
}

/**
 * Generates and downloads a pre-formatted Excel template for bulk student directory upload.
 */
export function downloadStudentDirectoryTemplate(): void {
  const headers = [
    'Sl No',
    'Student Full Name',
    'Register Number',
    'SATS ID',
    'Class',
    'Stream',
    'Combination',
    'Date of Birth',
    'Gender',
    'Father Name',
  ];

  const sampleRows = [
    [1, 'Aarav Patel', '24PU0101', 'SATS10884920', '1PUC', 'Science', 'PCMB', '2008-05-14', 'Male', 'Rajesh Patel'],
    [2, 'Ananya Sharma', '24PU0102', 'SATS10884921', '1PUC', 'Science', 'PCMB', '2008-09-22', 'Female', 'Mahesh Sharma'],
    [3, 'Bhavya Rao', '24PU0103', 'SATS10884922', '1PUC', 'Science', 'PCMC', '2008-01-30', 'Female', 'Suresh Rao'],
    [4, 'Deepak Kumar', '24PU0201', 'SATS10884930', '1PUC', 'Commerce', 'CEBA', '2008-03-18', 'Male', 'Gopal Kumar'],
    [5, 'Eshwar Murthy', '23PU0101', 'SATS10773810', '2PUC', 'Science', 'PCMB', '2007-04-10', 'Male', 'Narayana Murthy'],
  ];

  const data = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set nice column widths
  ws['!cols'] = [
    { wch: 8 },  // Sl No
    { wch: 24 }, // Name
    { wch: 18 }, // Register Number
    { wch: 18 }, // SATS ID
    { wch: 12 }, // Class
    { wch: 14 }, // Stream
    { wch: 14 }, // Combination
    { wch: 14 }, // DOB
    { wch: 10 }, // Gender
    { wch: 22 }, // Father Name
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Student Directory');

  XLSX.writeFile(wb, 'DutyFlow_Student_Master_Directory_Template.xlsx');
}

/**
 * Exports the active directory list to Excel (.xlsx).
 */
export function exportStudentDirectoryToExcel(profiles: StudentMasterProfile[]): void {
  const headers = [
    'Sl No',
    'Student Full Name',
    'Register Number',
    'SATS ID',
    'Class',
    'Stream',
    'Combination',
    'Date of Birth',
    'Gender',
    'Father Name',
    'Photo Attached',
  ];

  const rows = profiles.map((p, idx) => [
    idx + 1,
    p.name,
    p.registerNumber,
    p.satsNumber || '—',
    p.className,
    p.stream,
    p.combination,
    p.dob || '—',
    p.gender || '—',
    p.fatherName || '—',
    p.photoUrl ? 'YES' : 'NO',
  ]);

  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 8 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 22 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Student Directory');

  XLSX.writeFile(wb, `DutyFlow_Student_Master_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
}
