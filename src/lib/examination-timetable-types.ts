export interface TimetableClassColumn {
  id: string; // e.g. 'class-1', 'class-2'
  name: string; // e.g. 'Class 1', 'Class 2' or custom editable name
}

export interface TimetableClassTiming {
  startTime: string; // e.g. '10:00 AM'
  endTime: string;   // e.g. '01:00 PM'
}

export interface TimetableSlot {
  id: string;
  course?: string; // '1 PUC', '2 PUC', '1&2 PUC', or custom course name
  subjects: string[]; // e.g. ['English', 'Accountancy', 'Physics']
  timings: Record<string, TimetableClassTiming>; // key is classId
}

export interface TimetableRow {
  id: string;
  date: string; // 'YYYY-MM-DD'
  displayDate: string; // 'DD.MM.YYYY'
  day: string; // 'Monday', 'Tuesday', etc.
  slots: TimetableSlot[]; // multiple examination schedules under this single date & day
  course?: string; // backwards-compatible mirror of slots[0]?.course
  subjects?: string[]; // backwards-compatible mirror of slots[0]?.subjects
  timings?: Record<string, TimetableClassTiming>; // backwards-compatible mirror of slots[0]?.timings
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
  isPublished?: boolean;
  publishedAt?: string | null;
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
  isPublished?: boolean;
  publishedAt?: string | null;
  updatedAt: string;
}

export interface PublishedTimetableRecord {
  id: string;
  institutionId: string;
  institutionCode?: string;
  institutionName: string;
  examinationName: string;
  timetable: ExaminationTimetable;
  dateRange: string;
  totalDays: number;
  totalSubjects: number;
  classesCount: number;
  publishedAt: string;
  updatedAt: string;
}
