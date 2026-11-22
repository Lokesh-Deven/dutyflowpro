export type ResultClassification =
  | 'Distinction'
  | 'First Class'
  | 'Second Class'
  | 'Pass'
  | 'Needs Improvement'
  | 'Absent';

export type SubjectStatus = 'Pass' | 'Fail' | 'Absent';

export interface ExamResultSubject {
  subjectName: string;
  subjectCode?: string;
  maxMarks: number;
  passMarks: number;
  marksScored: number;
  percentage: number;
  grade: string;
  status: SubjectStatus;
  category: 'Language' | 'Core';
  isTopScoring?: boolean;
}

export interface ExamResultRecord {
  id: string;
  examId: string;
  examTitle: string;
  examType: 'Unit Test' | 'Mid-Term' | 'Preparatory' | 'Annual' | string;
  academicYear: string;
  studentId?: string;
  registerNumber: string;
  studentName: string;
  className: string;
  stream: string;
  combination: string;
  dob?: string;
  fatherName?: string;
  photoUrl?: string;
  subjects: ExamResultSubject[];
  grandTotal: number;
  maxGrandTotal: number;
  percentage: number;
  resultClassification: ResultClassification;
  status: 'Pass' | 'Fail' | 'Absent';
  rank?: number;
  publishedAt: string;
  institutionName?: string;
  validationWarnings?: string[];
}

export interface ExamResultBatch {
  id: string;
  examTitle: string;
  examType: string;
  academicYear: string;
  className: string;
  totalStudents: number;
  passedCount: number;
  distinctionCount: number;
  firstClassCount: number;
  secondClassCount: number;
  passClassCount: number;
  failCount: number;
  classAverage: number;
  subjectAverages: Record<string, number>;
  uploadedAt: string;
  records: ExamResultRecord[];
}

export interface MarksValidationIssue {
  row: number;
  student: string;
  registerNumber: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface MarksParsePreviewResult {
  valid: boolean;
  batchSummary: {
    examTitle: string;
    examType: string;
    academicYear: string;
    className: string;
    totalStudents: number;
    detectedSubjects: { name: string; maxMarks: number; passMarks: number; category: 'Language' | 'Core' }[];
  };
  records: ExamResultRecord[];
  warnings: MarksValidationIssue[];
  totalRows: number;
  invalidRowCount: number;
}

export interface StudentPerformanceInsights {
  strongestSubject: {
    name: string;
    marks: number;
    maxMarks: number;
    percentage: number;
    grade: string;
  } | null;
  needsFocusSubject: {
    name: string;
    marks: number;
    maxMarks: number;
    percentage: number;
    grade: string;
    marksNeededToPass?: number;
  } | null;
  overallObservation: string;
  milestoneMessage: string;
  languageAvg: number;
  coreAvg: number;
  trendTrajectory?: 'improving' | 'steady' | 'declining' | 'first-exam';
}
