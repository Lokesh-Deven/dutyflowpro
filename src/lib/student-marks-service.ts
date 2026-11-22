import * as XLSX from 'xlsx';
import { idbGet, idbSet } from './idb-storage';
import {
  ExamResultRecord,
  ExamResultSubject,
  ExamResultBatch,
  MarksParsePreviewResult,
  MarksValidationIssue,
  ResultClassification,
  StudentPerformanceInsights,
} from './student-marks-types';

const STORAGE_KEY = 'dutyflow_exam_results_batches_v1';

export function determineGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 35) return 'C';
  return 'F';
}

export function determineClassification(percentage: number, hasFailedSubject: boolean): ResultClassification {
  if (hasFailedSubject || percentage < 35) return 'Needs Improvement';
  if (percentage >= 85) return 'Distinction';
  if (percentage >= 60) return 'First Class';
  if (percentage >= 50) return 'Second Class';
  return 'Pass';
}

export function isLanguageSubject(subjectName: string): boolean {
  const s = subjectName.toLowerCase();
  return (
    s.includes('english') ||
    s.includes('kannada') ||
    s.includes('hindi') ||
    s.includes('sanskrit') ||
    s.includes('french') ||
    s.includes('urdu') ||
    s.includes('tamil') ||
    s.includes('telugu') ||
    s.includes('malayalam') ||
    s.includes('language')
  );
}

// -------------------------------------------------------------
// Seed Demo Data for Instant Exploration
// -------------------------------------------------------------
function makeSubjects(
  subData: { name: string; score: number; max?: number; pass?: number }[]
): ExamResultSubject[] {
  let highest = -1;
  subData.forEach((s) => {
    if (s.score > highest) highest = s.score;
  });

  return subData.map((s) => {
    const max = s.max ?? 100;
    const pass = s.pass ?? 35;
    const pct = Number(((s.score / max) * 100).toFixed(1));
    const isLang = isLanguageSubject(s.name);
    return {
      subjectName: s.name,
      maxMarks: max,
      passMarks: pass,
      marksScored: s.score,
      percentage: pct,
      grade: determineGrade(pct),
      status: s.score >= pass ? 'Pass' : 'Fail',
      category: isLang ? 'Language' : 'Core',
      isTopScoring: s.score === highest && s.score >= 80,
    };
  });
}

function calculateSummary(subjects: ExamResultSubject[]): {
  grandTotal: number;
  maxGrandTotal: number;
  percentage: number;
  resultClassification: ResultClassification;
  status: 'Pass' | 'Fail' | 'Absent';
} {
  const grandTotal = subjects.reduce((sum, s) => sum + s.marksScored, 0);
  const maxGrandTotal = subjects.reduce((sum, s) => sum + s.maxMarks, 0);
  const percentage = maxGrandTotal > 0 ? Number(((grandTotal / maxGrandTotal) * 100).toFixed(1)) : 0;
  const hasFailed = subjects.some((s) => s.status === 'Fail');
  const classification = determineClassification(percentage, hasFailed);
  return {
    grandTotal,
    maxGrandTotal,
    percentage,
    resultClassification: classification,
    status: hasFailed ? 'Fail' : 'Pass',
  };
}

export const DEMO_RESULT_BATCHES: ExamResultBatch[] = [
  // 1. Unit Test 1
  {
    id: 'batch-ut1-2025',
    examTitle: 'Unit Test 1 (2025-26)',
    examType: 'Unit Test',
    academicYear: '2025-26',
    className: '1PUC',
    totalStudents: 5,
    passedCount: 5,
    distinctionCount: 2,
    firstClassCount: 2,
    secondClassCount: 1,
    passClassCount: 0,
    failCount: 0,
    classAverage: 82.4,
    subjectAverages: {
      English: 85.0,
      'Kannada/Hindi': 82.0,
      Physics: 79.5,
      Chemistry: 83.2,
      Mathematics: 81.0,
      Biology: 85.4,
      Accountancy: 86.0,
      'Business Studies': 80.5,
      Economics: 84.0,
    },
    uploadedAt: '2025-08-20T10:00:00.000Z',
    records: [
      {
        id: 'rec-ut1-aarav',
        examId: 'batch-ut1-2025',
        examTitle: 'Unit Test 1 (2025-26)',
        examType: 'Unit Test',
        academicYear: '2025-26',
        registerNumber: '24PU0101',
        studentName: 'Aarav Patel',
        className: '1PUC',
        stream: 'Science',
        combination: 'PCMB',
        dob: '2008-05-14',
        fatherName: 'Rajesh Patel',
        subjects: makeSubjects([
          { name: 'English', score: 86 },
          { name: 'Kannada', score: 82 },
          { name: 'Physics', score: 80 },
          { name: 'Chemistry', score: 85 },
          { name: 'Mathematics', score: 84 },
          { name: 'Biology', score: 87 },
        ]),
        ...calculateSummary(
          makeSubjects([
            { name: 'English', score: 86 },
            { name: 'Kannada', score: 82 },
            { name: 'Physics', score: 80 },
            { name: 'Chemistry', score: 85 },
            { name: 'Mathematics', score: 84 },
            { name: 'Biology', score: 87 },
          ])
        ),
        publishedAt: '2025-08-20T10:00:00.000Z',
        institutionName: 'Pre-University College',
      },
      {
        id: 'rec-ut1-ananya',
        examId: 'batch-ut1-2025',
        examTitle: 'Unit Test 1 (2025-26)',
        examType: 'Unit Test',
        academicYear: '2025-26',
        registerNumber: '24PU0102',
        studentName: 'Ananya Sharma',
        className: '1PUC',
        stream: 'Science',
        combination: 'PCMB',
        dob: '2008-09-22',
        fatherName: 'Mahesh Sharma',
        subjects: makeSubjects([
          { name: 'English', score: 92 },
          { name: 'Hindi', score: 90 },
          { name: 'Physics', score: 88 },
          { name: 'Chemistry', score: 94 },
          { name: 'Mathematics', score: 91 },
          { name: 'Biology', score: 93 },
        ]),
        ...calculateSummary(
          makeSubjects([
            { name: 'English', score: 92 },
            { name: 'Hindi', score: 90 },
            { name: 'Physics', score: 88 },
            { name: 'Chemistry', score: 94 },
            { name: 'Mathematics', score: 91 },
            { name: 'Biology', score: 93 },
          ])
        ),
        publishedAt: '2025-08-20T10:00:00.000Z',
        institutionName: 'Pre-University College',
      },
      {
        id: 'rec-ut1-deepak',
        examId: 'batch-ut1-2025',
        examTitle: 'Unit Test 1 (2025-26)',
        examType: 'Unit Test',
        academicYear: '2025-26',
        registerNumber: '24PU0201',
        studentName: 'Deepak Kumar',
        className: '1PUC',
        stream: 'Commerce',
        combination: 'CEBA',
        dob: '2008-03-18',
        fatherName: 'Gopal Kumar',
        subjects: makeSubjects([
          { name: 'English', score: 84 },
          { name: 'Kannada', score: 78 },
          { name: 'Accountancy', score: 92 },
          { name: 'Business Studies', score: 85 },
          { name: 'Economics', score: 88 },
          { name: 'Computer Science', score: 89 },
        ]),
        ...calculateSummary(
          makeSubjects([
            { name: 'English', score: 84 },
            { name: 'Kannada', score: 78 },
            { name: 'Accountancy', score: 92 },
            { name: 'Business Studies', score: 85 },
            { name: 'Economics', score: 88 },
            { name: 'Computer Science', score: 89 },
          ])
        ),
        publishedAt: '2025-08-20T10:00:00.000Z',
        institutionName: 'Pre-University College',
      },
    ],
  },

  // 2. Mid-Term Examination 2025-26 (Main Comprehensive Exam)
  {
    id: 'batch-midterm-2025',
    examTitle: 'Mid-Term Examination 2025-26',
    examType: 'Mid-Term',
    academicYear: '2025-26',
    className: '1PUC',
    totalStudents: 6,
    passedCount: 6,
    distinctionCount: 3,
    firstClassCount: 2,
    secondClassCount: 1,
    passClassCount: 0,
    failCount: 0,
    classAverage: 84.8,
    subjectAverages: {
      English: 86.5,
      'Kannada/Hindi': 83.0,
      Physics: 82.5,
      Chemistry: 86.0,
      Mathematics: 84.2,
      Biology: 88.5,
      Accountancy: 89.2,
      'Business Studies': 84.0,
      Economics: 87.0,
      'Computer Science': 88.0,
    },
    uploadedAt: '2025-11-15T14:30:00.000Z',
    records: [
      {
        id: 'rec-mid-aarav',
        examId: 'batch-midterm-2025',
        examTitle: 'Mid-Term Examination 2025-26',
        examType: 'Mid-Term',
        academicYear: '2025-26',
        registerNumber: '24PU0101',
        studentName: 'Aarav Patel',
        className: '1PUC',
        stream: 'Science',
        combination: 'PCMB',
        dob: '2008-05-14',
        fatherName: 'Rajesh Patel',
        subjects: makeSubjects([
          { name: 'English', score: 89 },
          { name: 'Kannada', score: 85 },
          { name: 'Physics', score: 88 },
          { name: 'Chemistry', score: 92 },
          { name: 'Mathematics', score: 87 },
          { name: 'Biology', score: 93 },
        ]),
        ...calculateSummary(
          makeSubjects([
            { name: 'English', score: 89 },
            { name: 'Kannada', score: 85 },
            { name: 'Physics', score: 88 },
            { name: 'Chemistry', score: 92 },
            { name: 'Mathematics', score: 87 },
            { name: 'Biology', score: 93 },
          ])
        ),
        publishedAt: '2025-11-15T14:30:00.000Z',
        institutionName: 'Pre-University College',
      },
      {
        id: 'rec-mid-ananya',
        examId: 'batch-midterm-2025',
        examTitle: 'Mid-Term Examination 2025-26',
        examType: 'Mid-Term',
        academicYear: '2025-26',
        registerNumber: '24PU0102',
        studentName: 'Ananya Sharma',
        className: '1PUC',
        stream: 'Science',
        combination: 'PCMB',
        dob: '2008-09-22',
        fatherName: 'Mahesh Sharma',
        subjects: makeSubjects([
          { name: 'English', score: 95 },
          { name: 'Hindi', score: 92 },
          { name: 'Physics', score: 94 },
          { name: 'Chemistry', score: 97 },
          { name: 'Mathematics', score: 96 },
          { name: 'Biology', score: 98 },
        ]),
        ...calculateSummary(
          makeSubjects([
            { name: 'English', score: 95 },
            { name: 'Hindi', score: 92 },
            { name: 'Physics', score: 94 },
            { name: 'Chemistry', score: 97 },
            { name: 'Mathematics', score: 96 },
            { name: 'Biology', score: 98 },
          ])
        ),
        publishedAt: '2025-11-15T14:30:00.000Z',
        institutionName: 'Pre-University College',
      },
      {
        id: 'rec-mid-bhavya',
        examId: 'batch-midterm-2025',
        examTitle: 'Mid-Term Examination 2025-26',
        examType: 'Mid-Term',
        academicYear: '2025-26',
        registerNumber: '24PU0103',
        studentName: 'Bhavya Rao',
        className: '1PUC',
        stream: 'Science',
        combination: 'PCMC',
        dob: '2008-01-30',
        fatherName: 'Suresh Rao',
        subjects: makeSubjects([
          { name: 'English', score: 82 },
          { name: 'Kannada', score: 80 },
          { name: 'Physics', score: 76 },
          { name: 'Chemistry', score: 81 },
          { name: 'Mathematics', score: 84 },
          { name: 'Computer Science', score: 89 },
        ]),
        ...calculateSummary(
          makeSubjects([
            { name: 'English', score: 82 },
            { name: 'Kannada', score: 80 },
            { name: 'Physics', score: 76 },
            { name: 'Chemistry', score: 81 },
            { name: 'Mathematics', score: 84 },
            { name: 'Computer Science', score: 89 },
          ])
        ),
        publishedAt: '2025-11-15T14:30:00.000Z',
        institutionName: 'Pre-University College',
      },
      {
        id: 'rec-mid-deepak',
        examId: 'batch-midterm-2025',
        examTitle: 'Mid-Term Examination 2025-26',
        examType: 'Mid-Term',
        academicYear: '2025-26',
        registerNumber: '24PU0201',
        studentName: 'Deepak Kumar',
        className: '1PUC',
        stream: 'Commerce',
        combination: 'CEBA',
        dob: '2008-03-18',
        fatherName: 'Gopal Kumar',
        subjects: makeSubjects([
          { name: 'English', score: 86 },
          { name: 'Kannada', score: 81 },
          { name: 'Accountancy', score: 96 },
          { name: 'Business Studies', score: 88 },
          { name: 'Economics', score: 90 },
          { name: 'Computer Science', score: 93 },
        ]),
        ...calculateSummary(
          makeSubjects([
            { name: 'English', score: 86 },
            { name: 'Kannada', score: 81 },
            { name: 'Accountancy', score: 96 },
            { name: 'Business Studies', score: 88 },
            { name: 'Economics', score: 90 },
            { name: 'Computer Science', score: 93 },
          ])
        ),
        publishedAt: '2025-11-15T14:30:00.000Z',
        institutionName: 'Pre-University College',
      },
      {
        id: 'rec-mid-divya',
        examId: 'batch-midterm-2025',
        examTitle: 'Mid-Term Examination 2025-26',
        examType: 'Mid-Term',
        academicYear: '2025-26',
        registerNumber: '24PU0202',
        studentName: 'Divya Reddy',
        className: '1PUC',
        stream: 'Commerce',
        combination: 'CEBA',
        dob: '2008-07-25',
        fatherName: 'Venkat Reddy',
        subjects: makeSubjects([
          { name: 'English', score: 74 },
          { name: 'Hindi', score: 71 },
          { name: 'Accountancy', score: 79 },
          { name: 'Business Studies', score: 76 },
          { name: 'Economics', score: 78 },
          { name: 'Computer Science', score: 82 },
        ]),
        ...calculateSummary(
          makeSubjects([
            { name: 'English', score: 74 },
            { name: 'Hindi', score: 71 },
            { name: 'Accountancy', score: 79 },
            { name: 'Business Studies', score: 76 },
            { name: 'Economics', score: 78 },
            { name: 'Computer Science', score: 82 },
          ])
        ),
        publishedAt: '2025-11-15T14:30:00.000Z',
        institutionName: 'Pre-University College',
      },
    ],
  },

  // 3. Preparatory Examination 2026
  {
    id: 'batch-prep-2026',
    examTitle: 'Preparatory Examination 2026',
    examType: 'Preparatory',
    academicYear: '2025-26',
    className: '1PUC',
    totalStudents: 5,
    passedCount: 5,
    distinctionCount: 4,
    firstClassCount: 1,
    secondClassCount: 0,
    passClassCount: 0,
    failCount: 0,
    classAverage: 88.2,
    subjectAverages: {
      English: 90.0,
      'Kannada/Hindi': 86.5,
      Physics: 87.0,
      Chemistry: 90.5,
      Mathematics: 88.0,
      Biology: 92.0,
      Accountancy: 94.0,
      'Business Studies': 89.0,
      Economics: 91.0,
      'Computer Science': 92.5,
    },
    uploadedAt: '2026-01-28T16:00:00.000Z',
    records: [
      {
        id: 'rec-prep-aarav',
        examId: 'batch-prep-2026',
        examTitle: 'Preparatory Examination 2026',
        examType: 'Preparatory',
        academicYear: '2025-26',
        registerNumber: '24PU0101',
        studentName: 'Aarav Patel',
        className: '1PUC',
        stream: 'Science',
        combination: 'PCMB',
        dob: '2008-05-14',
        fatherName: 'Rajesh Patel',
        subjects: makeSubjects([
          { name: 'English', score: 92 },
          { name: 'Kannada', score: 88 },
          { name: 'Physics', score: 91 },
          { name: 'Chemistry', score: 95 },
          { name: 'Mathematics', score: 90 },
          { name: 'Biology', score: 96 },
        ]),
        ...calculateSummary(
          makeSubjects([
            { name: 'English', score: 92 },
            { name: 'Kannada', score: 88 },
            { name: 'Physics', score: 91 },
            { name: 'Chemistry', score: 95 },
            { name: 'Mathematics', score: 90 },
            { name: 'Biology', score: 96 },
          ])
        ),
        publishedAt: '2026-01-28T16:00:00.000Z',
        institutionName: 'Pre-University College',
      },
      {
        id: 'rec-prep-ananya',
        examId: 'batch-prep-2026',
        examTitle: 'Preparatory Examination 2026',
        examType: 'Preparatory',
        academicYear: '2025-26',
        registerNumber: '24PU0102',
        studentName: 'Ananya Sharma',
        className: '1PUC',
        stream: 'Science',
        combination: 'PCMB',
        dob: '2008-09-22',
        fatherName: 'Mahesh Sharma',
        subjects: makeSubjects([
          { name: 'English', score: 96 },
          { name: 'Hindi', score: 94 },
          { name: 'Physics', score: 96 },
          { name: 'Chemistry', score: 98 },
          { name: 'Mathematics', score: 97 },
          { name: 'Biology', score: 99 },
        ]),
        ...calculateSummary(
          makeSubjects([
            { name: 'English', score: 96 },
            { name: 'Hindi', score: 94 },
            { name: 'Physics', score: 96 },
            { name: 'Chemistry', score: 98 },
            { name: 'Mathematics', score: 97 },
            { name: 'Biology', score: 99 },
          ])
        ),
        publishedAt: '2026-01-28T16:00:00.000Z',
        institutionName: 'Pre-University College',
      },
      {
        id: 'rec-prep-deepak',
        examId: 'batch-prep-2026',
        examTitle: 'Preparatory Examination 2026',
        examType: 'Preparatory',
        academicYear: '2025-26',
        registerNumber: '24PU0201',
        studentName: 'Deepak Kumar',
        className: '1PUC',
        stream: 'Commerce',
        combination: 'CEBA',
        dob: '2008-03-18',
        fatherName: 'Gopal Kumar',
        subjects: makeSubjects([
          { name: 'English', score: 89 },
          { name: 'Kannada', score: 84 },
          { name: 'Accountancy', score: 98 },
          { name: 'Business Studies', score: 92 },
          { name: 'Economics', score: 94 },
          { name: 'Computer Science', score: 95 },
        ]),
        ...calculateSummary(
          makeSubjects([
            { name: 'English', score: 89 },
            { name: 'Kannada', score: 84 },
            { name: 'Accountancy', score: 98 },
            { name: 'Business Studies', score: 92 },
            { name: 'Economics', score: 94 },
            { name: 'Computer Science', score: 95 },
          ])
        ),
        publishedAt: '2026-01-28T16:00:00.000Z',
        institutionName: 'Pre-University College',
      },
    ],
  },
];

// -------------------------------------------------------------
// Storage Operations
// -------------------------------------------------------------
export async function getExamResultBatches(): Promise<ExamResultBatch[]> {
  try {
    const idbData = await idbGet<ExamResultBatch[]>(STORAGE_KEY);
    if (idbData && Array.isArray(idbData) && idbData.length > 0) {
      return idbData;
    }
  } catch (_) {}

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          idbSet(STORAGE_KEY, parsed).catch(() => {});
          return parsed;
        }
      }
    } catch (_) {}
  }

  // Initialize demo data
  const initial = [...DEMO_RESULT_BATCHES];
  await saveExamResultBatches(initial);
  return initial;
}

export async function saveExamResultBatches(batches: ExamResultBatch[]): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
    } catch (e) {
      console.warn('localStorage quota exceeded, relying on IndexedDB:', e);
    }
  }
  await idbSet(STORAGE_KEY, batches);
}

export async function saveExamResultBatch(batch: ExamResultBatch): Promise<void> {
  const current = await getExamResultBatches();
  const existingIdx = current.findIndex((b) => b.id === batch.id);
  if (existingIdx >= 0) {
    current[existingIdx] = batch;
  } else {
    current.unshift(batch);
  }
  await saveExamResultBatches(current);
}

export async function deleteExamResultBatch(batchId: string): Promise<void> {
  const current = await getExamResultBatches();
  const filtered = current.filter((b) => b.id !== batchId);
  await saveExamResultBatches(filtered);
}

// -------------------------------------------------------------
// Student Results Search by RegNo + DOB
// -------------------------------------------------------------
export async function getStudentResults(
  registerNumber: string,
  dob?: string
): Promise<{
  studentName: string;
  registerNumber: string;
  className: string;
  stream: string;
  combination: string;
  dob?: string;
  records: ExamResultRecord[];
} | null> {
  const cleanReg = registerNumber.trim().toUpperCase();
  if (!cleanReg) return null;

  const batches = await getExamResultBatches();
  const matchedRecords: ExamResultRecord[] = [];

  for (const batch of batches) {
    const rec = batch.records.find(
      (r) => r.registerNumber.trim().toUpperCase() === cleanReg
    );
    if (rec) {
      matchedRecords.push(rec);
    }
  }

  if (matchedRecords.length === 0) return null;

  // Optional DOB check if provided
  if (dob && dob.trim()) {
    const cleanDobInput = dob.trim().replace(/[-/.]/g, '');
    const firstRec = matchedRecords[0];
    if (firstRec.dob) {
      const cleanRecDob = firstRec.dob.trim().replace(/[-/.]/g, '');
      // If student has a recorded DOB and it doesn't match, return null
      if (cleanRecDob !== cleanDobInput && !cleanRecDob.includes(cleanDobInput) && !cleanDobInput.includes(cleanRecDob)) {
        return null;
      }
    }
  }

  // Sort exams chronologically: Unit Test -> Mid-Term -> Preparatory -> Annual
  const typeWeight: Record<string, number> = {
    'unit test': 1,
    'unit test 1': 1,
    'unit test 2': 2,
    'mid-term': 3,
    midterm: 3,
    preparatory: 4,
    annual: 5,
    final: 5,
  };

  matchedRecords.sort((a, b) => {
    const wa = typeWeight[a.examType.toLowerCase()] ?? 3;
    const wb = typeWeight[b.examType.toLowerCase()] ?? 3;
    if (wa !== wb) return wa - wb;
    return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
  });

  const latest = matchedRecords[matchedRecords.length - 1];

  return {
    studentName: latest.studentName,
    registerNumber: latest.registerNumber,
    className: latest.className,
    stream: latest.stream,
    combination: latest.combination,
    dob: latest.dob,
    records: matchedRecords,
  };
}

// -------------------------------------------------------------
// Excel Parsing with Dynamic Subject Auto-Detection & Calculation
// -------------------------------------------------------------
const STANDARD_METADATA_KEYS = new Set([
  'sl',
  'slno',
  'sl.no',
  's.no',
  'sno',
  'serial',
  'serialnumber',
  'reg',
  'regno',
  'reg.no',
  'registerno',
  'registernumber',
  'roll',
  'rollno',
  'rollnumber',
  'studentid',
  'id',
  'name',
  'studentname',
  'fullname',
  'candidate',
  'candidatename',
  'class',
  'classname',
  'grade',
  'course',
  'stream',
  'combination',
  'comb',
  'section',
  'sec',
  'total',
  'grandtotal',
  'maxmarks',
  'max',
  'percentage',
  'pct',
  '%',
  'result',
  'status',
  'division',
  'dob',
  'dateofbirth',
  'gender',
  'father',
  'fathername',
  'sats',
  'satsnumber',
]);

function normalizeKey(str: any): string {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function parseMarksExcel(
  file: File,
  options: {
    defaultExamTitle: string;
    defaultExamType: string;
    defaultAcademicYear: string;
    defaultClass: string;
  }
): Promise<MarksParsePreviewResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to 2D array of raw values to accurately read multi-row headers
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rawRows.length < 2) {
    throw new Error('The uploaded file does not contain enough rows of data.');
  }

  // Find header row (usually row 0 or row 1)
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const row = rawRows[r];
    const hasReg = row.some((c: any) => {
      const k = normalizeKey(c);
      return k.includes('reg') || k.includes('roll') || k.includes('student');
    });
    if (hasReg) {
      headerRowIndex = r;
      break;
    }
  }

  const headerRow = rawRows[headerRowIndex].map((c) => String(c || '').trim());
  const maxMarksRow = rawRows[headerRowIndex + 1];

  // Check if row below header has max marks (e.g. contains numbers like 100 or 'Max: 100')
  const hasDedicatedMaxMarksRow =
    maxMarksRow &&
    maxMarksRow.some((cell) => {
      const str = String(cell).toLowerCase();
      return str.includes('max') || str.includes('100') || str.includes('50') || str.includes('80');
    });

  const dataStartIndex = hasDedicatedMaxMarksRow ? headerRowIndex + 2 : headerRowIndex + 1;

  // Identify column indexes
  let regNoCol = -1;
  let nameCol = -1;
  let classCol = -1;
  let streamCol = -1;
  let combCol = -1;
  let dobCol = -1;
  let fatherCol = -1;

  interface DetectedSubjectCol {
    colIndex: number;
    subjectName: string;
    maxMarks: number;
    passMarks: number;
    category: 'Language' | 'Core';
  }

  const detectedSubjects: DetectedSubjectCol[] = [];

  headerRow.forEach((colName, idx) => {
    if (!colName) return;
    const norm = normalizeKey(colName);

    if (regNoCol === -1 && (norm.includes('reg') || norm.includes('roll') || norm.includes('studentid'))) {
      regNoCol = idx;
      return;
    }
    if (nameCol === -1 && (norm === 'name' || norm.includes('studentname') || norm.includes('candidate'))) {
      nameCol = idx;
      return;
    }
    if (classCol === -1 && (norm === 'class' || norm === 'classname' || norm === 'grade')) {
      classCol = idx;
      return;
    }
    if (streamCol === -1 && (norm === 'stream' || norm === 'course')) {
      streamCol = idx;
      return;
    }
    if (combCol === -1 && (norm === 'combination' || norm === 'comb')) {
      combCol = idx;
      return;
    }
    if (dobCol === -1 && (norm === 'dob' || norm.includes('birth'))) {
      dobCol = idx;
      return;
    }
    if (fatherCol === -1 && (norm.includes('father') || norm.includes('parent'))) {
      fatherCol = idx;
      return;
    }

    // Skip summary / metadata fields
    if (STANDARD_METADATA_KEYS.has(norm)) return;

    // Check if column is a Subject column
    let maxMarks = 100;
    let passMarks = 35;
    let cleanName = colName;

    // Parse max marks from header e.g. "Physics (100)" or "Mathematics [Max: 100]"
    const parenMatch = colName.match(/\((?:Max:?\s*)?(\d+)\)/i) || colName.match(/\[(?:Max:?\s*)?(\d+)\]/i);
    if (parenMatch) {
      maxMarks = parseInt(parenMatch[1], 10);
      cleanName = colName.replace(/\((?:Max:?\s*)?(\d+)\)/i, '').replace(/\[(?:Max:?\s*)?(\d+)\]/i, '').trim();
    } else if (hasDedicatedMaxMarksRow && maxMarksRow && maxMarksRow[idx]) {
      const parsedNum = parseFloat(String(maxMarksRow[idx]).replace(/[^\d.]/g, ''));
      if (!isNaN(parsedNum) && parsedNum > 0) {
        maxMarks = parsedNum;
      }
    }

    passMarks = Math.round(maxMarks * 0.35);

    detectedSubjects.push({
      colIndex: idx,
      subjectName: cleanName || `Subject ${idx + 1}`,
      maxMarks,
      passMarks,
      category: isLanguageSubject(cleanName) ? 'Language' : 'Core',
    });
  });

  if (regNoCol === -1) {
    throw new Error('Could not find Register Number or Roll Number column in the uploaded sheet.');
  }

  if (detectedSubjects.length === 0) {
    throw new Error('No subject marks columns could be detected in the uploaded sheet.');
  }

  const records: ExamResultRecord[] = [];
  const warnings: MarksValidationIssue[] = [];

  for (let r = dataStartIndex; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0 || row.every((c: any) => String(c).trim() === '')) {
      continue;
    }

    const regNoRaw = String(row[regNoCol] || '').trim();
    if (!regNoRaw) {
      warnings.push({
        row: r + 1,
        student: String(row[nameCol] || 'Unknown'),
        registerNumber: 'MISSING',
        field: 'Register Number',
        message: 'Missing register number on this row; row skipped.',
        severity: 'error',
      });
      continue;
    }

    const studentName = (nameCol >= 0 && row[nameCol] ? String(row[nameCol]).trim() : `Student ${regNoRaw}`);
    const className = (classCol >= 0 && row[classCol] ? String(row[classCol]).trim() : options.defaultClass);
    const stream = (streamCol >= 0 && row[streamCol] ? String(row[streamCol]).trim() : 'Science');
    const combination = (combCol >= 0 && row[combCol] ? String(row[combCol]).trim() : 'PCMB');
    const dob = (dobCol >= 0 && row[dobCol] ? String(row[dobCol]).trim() : undefined);
    const fatherName = (fatherCol >= 0 && row[fatherCol] ? String(row[fatherCol]).trim() : undefined);

    const subjects: ExamResultSubject[] = [];

    detectedSubjects.forEach((sub) => {
      const rawVal = row[sub.colIndex];
      let marksScored = 0;
      let status: 'Pass' | 'Fail' | 'Absent' = 'Pass';

      const strVal = String(rawVal).trim().toUpperCase();
      if (strVal === 'AB' || strVal === 'ABSENT' || strVal === 'A') {
        marksScored = 0;
        status = 'Absent';
      } else {
        const num = parseFloat(strVal);
        if (isNaN(num)) {
          warnings.push({
            row: r + 1,
            student: studentName,
            registerNumber: regNoRaw,
            field: sub.subjectName,
            message: `Invalid marks value "${rawVal}". Defaulted to 0.`,
            severity: 'warning',
          });
          marksScored = 0;
          status = 'Fail';
        } else if (num < 0) {
          warnings.push({
            row: r + 1,
            student: studentName,
            registerNumber: regNoRaw,
            field: sub.subjectName,
            message: `Negative marks (${num}) detected. Set to 0.`,
            severity: 'error',
          });
          marksScored = 0;
          status = 'Fail';
        } else if (num > sub.maxMarks) {
          warnings.push({
            row: r + 1,
            student: studentName,
            registerNumber: regNoRaw,
            field: sub.subjectName,
            message: `Marks (${num}) exceed Max Marks (${sub.maxMarks}). Capped to max.`,
            severity: 'warning',
          });
          marksScored = sub.maxMarks;
          status = 'Pass';
        } else {
          marksScored = num;
          status = num >= sub.passMarks ? 'Pass' : 'Fail';
        }
      }

      const pct = sub.maxMarks > 0 ? Number(((marksScored / sub.maxMarks) * 100).toFixed(1)) : 0;
      const grade = status === 'Absent' ? 'F' : determineGrade(pct);

      subjects.push({
        subjectName: sub.subjectName,
        maxMarks: sub.maxMarks,
        passMarks: sub.passMarks,
        marksScored,
        percentage: pct,
        grade,
        status,
        category: sub.category,
      });
    });

    // Mark top scoring subject(s)
    let highestMark = -1;
    subjects.forEach((s) => {
      if (s.marksScored > highestMark) highestMark = s.marksScored;
    });
    subjects.forEach((s) => {
      s.isTopScoring = s.marksScored === highestMark && s.marksScored >= 75;
    });

    const summary = calculateSummary(subjects);

    records.push({
      id: `rec-${options.defaultExamTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${regNoRaw}`,
      examId: '',
      examTitle: options.defaultExamTitle,
      examType: options.defaultExamType,
      academicYear: options.defaultAcademicYear,
      registerNumber: regNoRaw,
      studentName,
      className,
      stream,
      combination,
      dob,
      fatherName,
      subjects,
      ...summary,
      publishedAt: new Date().toISOString(),
      validationWarnings: warnings
        .filter((w) => w.row === r + 1)
        .map((w) => w.message),
    });
  }

  // Calculate ranks based on grandTotal
  records.sort((a, b) => b.grandTotal - a.grandTotal);
  records.forEach((rec, idx) => {
    rec.rank = idx + 1;
  });

  return {
    valid: records.length > 0 && warnings.filter((w) => w.severity === 'error').length === 0,
    batchSummary: {
      examTitle: options.defaultExamTitle,
      examType: options.defaultExamType,
      academicYear: options.defaultAcademicYear,
      className: options.defaultClass,
      totalStudents: records.length,
      detectedSubjects: detectedSubjects.map((s) => ({
        name: s.subjectName,
        maxMarks: s.maxMarks,
        passMarks: s.passMarks,
        category: s.category,
      })),
    },
    records,
    warnings,
    totalRows: rawRows.length - dataStartIndex,
    invalidRowCount: warnings.filter((w) => w.severity === 'error').length,
  };
}

// -------------------------------------------------------------
// Excel Template Download
// -------------------------------------------------------------
export function downloadMarksExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Science Stream Sheet
  const scienceHeaders = [
    'Sl No',
    'Register Number',
    'Student Name',
    'Class',
    'Stream',
    'Combination',
    'Date of Birth',
    'English (100)',
    'Kannada/Hindi (100)',
    'Physics (100)',
    'Chemistry (100)',
    'Mathematics (100)',
    'Biology (100)',
    'Total (600)',
    'Result',
  ];

  const scienceData = [
    scienceHeaders,
    ['', 'MAX MARKS', '', '', '', '', '', '100', '100', '100', '100', '100', '100', '600', 'PASS MARKS: 35/100'],
    ['1', '24PU0101', 'Aarav Patel', '1PUC', 'Science', 'PCMB', '2008-05-14', 89, 85, 88, 92, 87, 93, 534, 'Distinction'],
    ['2', '24PU0102', 'Ananya Sharma', '1PUC', 'Science', 'PCMB', '2008-09-22', 95, 92, 94, 97, 96, 98, 572, 'Distinction'],
    ['3', '24PU0103', 'Bhavya Rao', '1PUC', 'Science', 'PCMC', '2008-01-30', 82, 80, 76, 81, 84, 89, 492, 'First Class'],
    ['4', '24PU0104', 'Chirag Mehta', '1PUC', 'Science', 'PCMC', '2008-11-12', 74, 72, 68, 70, 75, 78, 437, 'First Class'],
  ];

  const wsScience = XLSX.utils.aoa_to_sheet(scienceData);
  wsScience['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 22 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsScience, 'Science_Marks_Template');

  // Commerce Stream Sheet
  const commerceHeaders = [
    'Sl No',
    'Register Number',
    'Student Name',
    'Class',
    'Stream',
    'Combination',
    'Date of Birth',
    'English (100)',
    'Kannada/Hindi (100)',
    'Accountancy (100)',
    'Business Studies (100)',
    'Economics (100)',
    'Computer Science (100)',
    'Total (600)',
    'Result',
  ];

  const commerceData = [
    commerceHeaders,
    ['', 'MAX MARKS', '', '', '', '', '', '100', '100', '100', '100', '100', '100', '600', 'PASS MARKS: 35/100'],
    ['1', '24PU0201', 'Deepak Kumar', '1PUC', 'Commerce', 'CEBA', '2008-03-18', 86, 81, 96, 88, 90, 93, 534, 'Distinction'],
    ['2', '24PU0202', 'Divya Reddy', '1PUC', 'Commerce', 'CEBA', '2008-07-25', 74, 71, 79, 76, 78, 82, 460, 'First Class'],
    ['3', '23PU0201', 'Gowri Shankar', '2PUC', 'Commerce', 'CEBA', '2007-02-05', 88, 84, 94, 90, 91, 92, 539, 'Distinction'],
  ];

  const wsCommerce = XLSX.utils.aoa_to_sheet(commerceData);
  wsCommerce['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 22 },
    { wch: 10 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
    { wch: 14 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsCommerce, 'Commerce_Marks_Template');

  XLSX.writeFile(wb, 'DutyFlow_Marks_Upload_Sample_Template.xlsx');
}

// -------------------------------------------------------------
// Export Batch to Excel
// -------------------------------------------------------------
export function exportExamResultsToExcel(batch: ExamResultBatch): void {
  if (!batch.records || batch.records.length === 0) return;

  const subjectNames = Array.from(
    new Set(batch.records.flatMap((r) => r.subjects.map((s) => s.subjectName)))
  );

  const header = [
    'Rank',
    'Register Number',
    'Student Name',
    'Class',
    'Stream',
    'Combination',
    'Date of Birth',
    ...subjectNames,
    'Grand Total',
    'Max Marks',
    'Percentage',
    'Result Classification',
    'Status',
  ];

  const rows: any[][] = [header];

  batch.records.forEach((rec) => {
    const subMap: Record<string, number> = {};
    rec.subjects.forEach((s) => {
      subMap[s.subjectName] = s.marksScored;
    });

    const row = [
      rec.rank || '—',
      rec.registerNumber,
      rec.studentName,
      rec.className,
      rec.stream,
      rec.combination,
      rec.dob || '—',
      ...subjectNames.map((s) => (subMap[s] !== undefined ? subMap[s] : '—')),
      rec.grandTotal,
      rec.maxGrandTotal,
      `${rec.percentage}%`,
      rec.resultClassification,
      rec.status,
    ];
    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  const cleanTitle = batch.examTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 28);
  XLSX.utils.book_append_sheet(wb, ws, cleanTitle);

  XLSX.writeFile(wb, `${cleanTitle}_Results_Sheet.xlsx`);
}

// -------------------------------------------------------------
// Calculate Actionable Insights & Spider/Radar Strengths
// -------------------------------------------------------------
export function calculateStudentInsights(
  record: ExamResultRecord,
  classAverage: number = 80,
  trendRecords: ExamResultRecord[] = []
): StudentPerformanceInsights {
  const subjects = record.subjects;

  // Strongest Subject
  let strongest: ExamResultSubject | null = null;
  let highestPct = -1;
  subjects.forEach((s) => {
    if (s.percentage > highestPct) {
      highestPct = s.percentage;
      strongest = s;
    }
  });

  // Subject Needing Focus (lowest score or backlog)
  let needsFocus: ExamResultSubject | null = null;
  let lowestPct = 101;
  subjects.forEach((s) => {
    if (s.percentage < lowestPct) {
      lowestPct = s.percentage;
      needsFocus = s;
    }
  });

  // Language vs Core averages
  const languages = subjects.filter((s) => s.category === 'Language');
  const coreSubjects = subjects.filter((s) => s.category === 'Core');

  const languageAvg =
    languages.length > 0
      ? Number(
          (
            languages.reduce((sum, s) => sum + s.percentage, 0) / languages.length
          ).toFixed(1)
        )
      : record.percentage;

  const coreAvg =
    coreSubjects.length > 0
      ? Number(
          (
            coreSubjects.reduce((sum, s) => sum + s.percentage, 0) / coreSubjects.length
          ).toFixed(1)
        )
      : record.percentage;

  // Milestone distance
  let milestoneMessage = '';
  if (record.resultClassification === 'Distinction') {
    milestoneMessage = `Outstanding achievement! You achieved Distinction with ${record.percentage}% (${record.grandTotal}/${record.maxGrandTotal} marks).`;
  } else if (record.resultClassification === 'First Class') {
    const needed = Math.ceil(record.maxGrandTotal * 0.85 - record.grandTotal);
    milestoneMessage = `${needed > 0 ? needed : 1} mark${needed > 1 ? 's' : ''} away from Distinction (85.0%). Exceptional potential!`;
  } else if (record.resultClassification === 'Second Class') {
    const needed = Math.ceil(record.maxGrandTotal * 0.6 - record.grandTotal);
    milestoneMessage = `${needed > 0 ? needed : 1} marks away from First Class (60.0%). Target consistent revision in core subjects.`;
  } else if (record.status === 'Fail' && needsFocus) {
    const focusSub = needsFocus as ExamResultSubject;
    const diff = focusSub.passMarks - focusSub.marksScored;
    milestoneMessage = `Focus on ${focusSub.subjectName}: Needs ${diff > 0 ? diff : 1} marks to clear pass threshold.`;
  } else {
    milestoneMessage = 'Passed all subjects. Focus on practice tests to elevate overall score toward First Class.';
  }

  // Trend Trajectory
  let trendTrajectory: 'improving' | 'steady' | 'declining' | 'first-exam' = 'first-exam';
  if (trendRecords.length >= 2) {
    const prev = trendRecords[trendRecords.length - 2];
    const diff = record.percentage - prev.percentage;
    if (diff > 1.5) trendTrajectory = 'improving';
    else if (diff < -1.5) trendTrajectory = 'declining';
    else trendTrajectory = 'steady';
  }

  let overallObservation = '';
  if (record.percentage >= classAverage + 5) {
    overallObservation = `Performing ${(record.percentage - classAverage).toFixed(1)}% above the overall class average (${classAverage}%). Keep maintaining this momentum!`;
  } else if (record.percentage >= classAverage) {
    overallObservation = `Performing on par with the class average (${classAverage}%). Strong command across stream subjects.`;
  } else {
    overallObservation = `Current score is ${(classAverage - record.percentage).toFixed(1)}% below the class average (${classAverage}%). Structured revision can quickly bridge this gap.`;
  }

  return {
    strongestSubject: strongest
      ? {
          name: (strongest as ExamResultSubject).subjectName,
          marks: (strongest as ExamResultSubject).marksScored,
          maxMarks: (strongest as ExamResultSubject).maxMarks,
          percentage: (strongest as ExamResultSubject).percentage,
          grade: (strongest as ExamResultSubject).grade,
        }
      : null,
    needsFocusSubject: needsFocus
      ? {
          name: (needsFocus as ExamResultSubject).subjectName,
          marks: (needsFocus as ExamResultSubject).marksScored,
          maxMarks: (needsFocus as ExamResultSubject).maxMarks,
          percentage: (needsFocus as ExamResultSubject).percentage,
          grade: (needsFocus as ExamResultSubject).grade,
          marksNeededToPass:
            (needsFocus as ExamResultSubject).status === 'Fail'
              ? (needsFocus as ExamResultSubject).passMarks - (needsFocus as ExamResultSubject).marksScored
              : undefined,
        }
      : null,
    overallObservation,
    milestoneMessage,
    languageAvg,
    coreAvg,
    trendTrajectory,
  };
}
