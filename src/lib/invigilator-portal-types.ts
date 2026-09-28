/**
 * Types and interfaces for Invigilator Portal and Room Attendance
 */

export type AttendanceStatus = 'Present' | 'Absent' | 'Not Marked';

export interface InvigilatorSession {
  invigilatorId: string;
  name: string;
  email: string;
  mobile: string;
  designation?: string;
  department?: string;
  institutionName?: string;
  loginAt: string;
  role: 'invigilator';
}

export interface StudentAttendanceRecord {
  registerNumber: string;
  studentName: string;
  section: string;
  benchNumber?: string;
  position?: 'Left' | 'Center' | 'Right' | 'Unassigned';
  status: AttendanceStatus;
  markedAt?: string;
}

export interface InvigilatorDuty {
  dutyId: string;
  examinationId: string;
  examName: string;
  subjectName: string;
  subjectCode?: string;
  date: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "28 September 2026"
  dayOfWeek?: string;
  startTime: string; // e.g. "10:00 AM"
  endTime: string; // e.g. "11:30 AM"
  sessionTime: string; // e.g. "10:00 AM – 11:30 AM"
  sessionPeriod: 'Morning' | 'Afternoon' | 'Evening' | 'General';
  roomNo: string; // e.g. "108"
  roomId?: string;
  totalStudents: number;
  invigilatorId: string;
  invigilatorName: string;
  isToday: boolean;
  isUpcoming: boolean;
  isPast: boolean;
  attendanceSubmitted: boolean;
  attendanceStatus?: 'Pending' | 'Submitted' | 'Correction Requested';
  submittedAt?: string;
  submissionId?: string;
}

export interface RoomAttendanceSubmission {
  id: string;
  dutyId: string;
  examinationId: string;
  examName: string;
  subjectName: string;
  date: string;
  sessionTime: string;
  roomNo: string;
  invigilatorId: string;
  invigilatorName: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  submittedAt: string; // e.g. "10:45 AM"
  submittedTimestamp: string; // ISO
  isLocked: boolean;
  correctionRequested?: boolean;
  correctionReason?: string;
  records: StudentAttendanceRecord[];
}

export interface InvigilatorPinRecord {
  invigilatorId: string;
  identifier: string; // email or mobile
  pinHash: string;
  salt: string;
  updatedAt: string;
}

export interface InvigilatorAuthResult {
  success: boolean;
  session?: InvigilatorSession;
  error?: string;
  isFirstTime?: boolean;
}
