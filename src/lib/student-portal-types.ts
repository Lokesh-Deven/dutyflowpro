import { PositionSlot } from './student-seating-types';

export interface StudentSession {
  registerNumber: string;
  studentName: string;
  section?: string;
  courseStream?: string;
  institutionName?: string;
  loginAt: string;
  role: 'student';
}

export interface StudentExaminationDetail {
  id: string;
  examId?: string;
  examName: string;
  date: string;              // e.g. "2026-09-28"
  formattedDate: string;     // e.g. "28 September 2026"
  dayOfWeek: string;         // e.g. "Monday"
  startTime: string;         // e.g. "10:00 AM"
  endTime: string;           // e.g. "11:30 AM"
  timeSlot: string;          // e.g. "10:00 AM – 11:30 AM"
  subjectId: string;
  subjectName: string;       // e.g. "English"
  subjectCode?: string;      // e.g. "ENG101"
  courseStream: string;      // e.g. "2 PUC" or "B.Com"
  section: string;           // e.g. "2A"
  studentName: string;       // e.g. "Rahul Kumar"
  registerNumber: string;    // e.g. "123456"
  roomNo: string;            // e.g. "108"
  roomId?: string;
  benchNumber: string;       // e.g. "B12"
  benchSide?: 'LEFT' | 'MIDDLE' | 'RIGHT';
  position: 'Left' | 'Center' | 'Right' | 'Side A' | 'Side B' | 'Unassigned';
  positionSlot?: PositionSlot;
  rowLabel?: string;         // e.g. "Row 2"
  isToday: boolean;
  isUpcoming: boolean;
  isPast: boolean;
  status: 'Confirmed' | 'Pending Allocation';
}

export interface StudentPinRecord {
  registerNumber: string;
  pinHash: string;
  salt: string;
  isCustomPin: boolean;
  updatedAt: string;
}

export interface StudentAuthResult {
  success: boolean;
  session?: StudentSession;
  error?: string;
  isFirstTime?: boolean;
}
