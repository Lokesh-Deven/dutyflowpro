export type SeatingPattern = '1_PER_BENCH' | '2_PER_BENCH' | '3_PER_BENCH';

export type PositionSlot = 'SIDE_A' | 'CENTER' | 'SIDE_B';

export interface SeatingMasterRoom {
  id: string;
  roomNo: string;
  leftBenches: number;
  middleBenches?: number;
  rightBenches: number;
  totalBenches: number;
  capacityOne: number;
  capacityTwo: number;
  capacityThree: number;
  status: 'Available' | 'In Use';
  isLocked?: boolean;
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
  isDisabled?: boolean;
  isVacant?: boolean;
}

export interface PhysicalBench {
  benchNumber: number;
  side: 'LEFT' | 'MIDDLE' | 'RIGHT';
  seats: BenchPositionSeat[];
  rowNumber?: number;
  rowLabel?: string;
  orderNumber?: number;
  orderLabel?: string;
}

export interface MultiSubjectRow {
  rowNumber: number; // 1, 2, 3, 4
  sideA: string;     // subjectId
  center: string;    // subjectId or 'NIL' / 'VACANT'
  sideB: string;     // subjectId
  enabled?: boolean;
}

export type MultiSubjectOrder = MultiSubjectRow;

export type MiddleBenchSeatingPattern =
  | 'allThree'        // All Three Seats – Side A, Centre, Side B
  | 'centerOnly'      // Centre Seat Only
  | 'sideAAndSideB'   // Side A and Side B Only
  | 'custom';         // Custom Seat Selection

export interface MiddleBenchSeatsEnabled {
  sideA: boolean;
  center: boolean;
  sideB: boolean;
}

export interface MiddleBenchSeatsConfig {
  sideA: string;   // subjectId or 'VACANT' / 'NIL'
  center: string;  // subjectId or 'VACANT' / 'NIL'
  sideB: string;   // subjectId or 'VACANT' / 'NIL'
}

export interface ThreeColumnBenchConfig {
  sideA: string;   // subjectId or 'EMPTY' / 'VACANT'
  center: string;  // subjectId or 'EMPTY' / 'VACANT'
  sideB: string;   // subjectId or 'EMPTY' / 'VACANT'
}

export interface ThreeColumnPatternConfig {
  enabled: boolean;
  // Flexible modern configuration
  leftSubjectId?: string;       // subjectId or 'VACANT' / 'NIL'
  rightSubjectId?: string;      // subjectId or 'VACANT' / 'NIL'
  middlePattern?: MiddleBenchSeatingPattern;
  middleEnabledSeats?: MiddleBenchSeatsEnabled;
  middleSeats?: MiddleBenchSeatsConfig;

  // Backwards compatibility with previous versions
  left?: ThreeColumnBenchConfig;
  middle?: ThreeColumnBenchConfig;
  right?: ThreeColumnBenchConfig;
}

export interface MultiSubjectConfig {
  enabled: boolean;
  rows: MultiSubjectRow[];
}

export interface RoomSeatingPlan {
  roomId: string;
  roomNo: string;
  leftBenches: number;
  middleBenches?: number;
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
  multiSubjectConfig?: MultiSubjectConfig;
  threeColumnConfig?: ThreeColumnPatternConfig;
  status: 'Draft' | 'Finalized' | 'Published';
  isPublished?: boolean;
  publishedAt?: string;
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
