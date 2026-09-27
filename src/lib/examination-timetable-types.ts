export interface TimetableClassColumn {
  id: string; // e.g. 'class-1', 'class-2'
  name: string; // e.g. 'Class 1', 'Class 2' or custom editable name
}

export interface TimetableClassTiming {
  startTime: string; // e.g. '10:00 AM'
  endTime: string;   // e.g. '01:00 PM'
}

export interface TimetableRow {
  id: string;
  date: string; // 'YYYY-MM-DD'
  displayDate: string; // 'DD.MM.YYYY'
  day: string; // 'Monday', 'Tuesday', etc.
  subjects: string[]; // e.g. ['English', 'Accountancy', 'Physics']
  timings: Record<string, TimetableClassTiming>; // key is classId
}

export interface ExaminationTimetable {
  id: string;
  userId?: string;
  institutionName: string;
  examinationName: string;
  title: string; // 'TIMETABLE'
  classes: TimetableClassColumn[];
  rows: TimetableRow[];
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedTimetableSummary {
  id: string;
  examinationName: string;
  institutionName: string;
  dateRange: string;
  totalDays: number;
  totalSubjects: number;
  classesCount: number;
  isLocked: boolean;
  updatedAt: string;
}
