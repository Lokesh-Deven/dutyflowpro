export type SeatingPattern = '1_PER_BENCH' | '2_PER_BENCH' | '3_PER_BENCH';

export type PositionSlot = 'SIDE_A' | 'CENTER' | 'SIDE_B';

export interface SeatingMasterRoom {
  id: string;
  roomNo: string;
  leftBenches: number;
  rightBenches: number;
  totalBenches: number;
  capacityOne: number;
  capacityTwo: number;
  capacityThree: number;
  status: 'Available' | 'In Use';
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentSubject {
  id: string;
  name: string;
  code?: string;
  expectedStudents: number;
  uploadedStudentsCount: number;
  createdAt?: string;
}

export interface StudentRecord {
  id: string;
  subjectId: string;
  name: string;
  section: string;
  rollNo: string;
  createdAt?: string;
}

export interface BenchPositionSeat {
  position: PositionSlot;
  student?: StudentRecord;
  subjectId?: string;
  subjectName?: string;
}

export interface PhysicalBench {
  benchNumber: number;
  side: 'LEFT' | 'RIGHT';
  seats: BenchPositionSeat[];
}

export interface RoomSeatingPlan {
  roomId: string;
  roomNo: string;
  leftBenches: number;
  rightBenches: number;
  totalBenches: number;
  capacity: number;
  allocatedCount: number;
  vacantCount: number;
  status: 'Full' | 'Partial' | 'Available' | 'Error';
  benches: PhysicalBench[];
}

export interface SubjectAllocationStat {
  subjectId: string;
  subjectName: string;
  totalStudents: number;
  allocatedCount: number;
  status: 'Complete' | 'Partial' | 'Unallocated';
}

export interface SeatingAllocationSummary {
  totalStudents: number;
  totalRooms: number;
  totalCapacity: number;
  allocatedStudents: number;
  vacantSeats: number;
  unallocatedStudents: number;
  isReady: boolean;
  issues: string[];
}

export interface SeatingAllocationRecord {
  id: string;
  name: string;
  examination: {
    examId?: string;
    examName: string;
    date: string;
    startTime: string;
    endTime: string;
  };
  subjectIds: string[];
  pattern: SeatingPattern;
  positionMapping: Record<PositionSlot, string>; // PositionSlot -> subjectId
  roomIds: string[];
  roomPlans: RoomSeatingPlan[];
  subjectStats: SubjectAllocationStat[];
  summary: SeatingAllocationSummary;
  status: 'Draft' | 'Finalized';
  createdAt: string;
  updatedAt: string;
}

export interface StudentDataValidationResult {
  expectedCount: number;
  totalRows: number;
  validRecords: StudentRecord[];
  errors: { row: number; reason: string }[];
  duplicates: { rollNo: string; count: number }[];
  isValid: boolean;
  warning?: string;
}
