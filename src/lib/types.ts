export const ALL_WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type Weekday = typeof ALL_WEEKDAYS[number];

export type Invigilator = {
  id: string;
  name: string;
  designation: string;
  mobile: string;
  email: string;
  isAvailableAllDays: boolean;
  availableExamIds: string[];
  workingDays?: string[];
};

export type DirectoryInvigilator = {
  id: string;
  name: string;
  designation: string;
  mobile: string;
  email: string;
  workingDays?: string[];
  createdAt?: string;
};

export type Examination = {
  id:string;
  date: Date;
  subject: string;
  startTime: string;
  endTime: string;
  rooms: number;
  relievers: number;
  college: string;
  examName: string;
};

export interface AllotmentResult {
  assignments: Record<string, string[]>; // invigilatorId -> examId[]
}

export type RoomAllocationStatus = 'Pending' | 'Generated' | 'Locked';

export type MasterRoom = {
  id: string;
  name: string;
};

export type InvigilatorRoomDuty = {
  invigilatorId: string;
  invigilatorName: string;
  designation?: string;
  room: string;
};

export type RelieverRoomDuty = {
  relieverId: string;
  relieverName: string;
  designation?: string;
  rooms: string[];
};

export type SessionRoomAllocation = {
  examId: string;
  selectedRooms: string[];
  invigilatorDuties: InvigilatorRoomDuty[];
  relieverDuties: RelieverRoomDuty[];
  status: RoomAllocationStatus;
  warnings?: string[];
  generatedAt?: string;
  lockedAt?: string;
};

export type SavedAllotment = {
  id: string;
  name: string;
  invigilators: Invigilator[];
  examinations: Examination[];
  assignments: AllotmentResult['assignments'];
  createdAt: Date;
  status: 'Draft' | 'Finalized';
  roomAllocations?: Record<string, SessionRoomAllocation>; // examId -> SessionRoomAllocation
};

export type InstructionItem = {
  id: string;
  text: string;
  enabled: boolean;
};

export type SignatoryInfo = {
  name: string;
  designation: string;
};

