import {
  SeatingMasterRoom,
  StudentSubject,
  StudentRecord,
  SeatingPattern,
  PositionSlot,
  RoomSeatingPlan,
  PhysicalBench,
  BenchPositionSeat,
  SubjectAllocationStat,
  SeatingAllocationSummary,
} from './student-seating-types';

export interface RunAllocationInput {
  rooms: SeatingMasterRoom[];
  subjects: StudentSubject[];
  studentsBySubject: Record<string, StudentRecord[]>;
  pattern: SeatingPattern;
  positionMapping: Record<PositionSlot, string>; // PositionSlot -> subjectId
}

export interface RunAllocationResult {
  roomPlans: RoomSeatingPlan[];
  subjectStats: SubjectAllocationStat[];
  summary: SeatingAllocationSummary;
}

/**
 * Deterministic, rule-based Student Seating Allocation Engine.
 * Reproducible and auditable.
 */
export function runDeterministicSeatingAllocation(input: RunAllocationInput): RunAllocationResult {
  const { rooms, subjects, studentsBySubject, pattern, positionMapping } = input;

  // 1. Sort students sequentially by roll number for each subject
  const queues: Record<string, StudentRecord[]> = {};
  const initialCounts: Record<string, number> = {};

  subjects.forEach((subj) => {
    const list = studentsBySubject[subj.id] || [];
    // Sequential natural sort by roll number
    const sorted = [...list].sort((a, b) =>
      a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true, sensitivity: 'base' })
    );
    queues[subj.id] = sorted;
    initialCounts[subj.id] = sorted.length;
  });

  const totalStudents = Object.values(initialCounts).reduce((sum, n) => sum + n, 0);

  // Determine active positions per bench based on pattern
  const activePositions: PositionSlot[] =
    pattern === '1_PER_BENCH'
      ? ['CENTER']
      : pattern === '2_PER_BENCH'
      ? ['SIDE_A', 'SIDE_B']
      : ['SIDE_A', 'CENTER', 'SIDE_B'];

  const seatsPerBench = activePositions.length;

  // Track assignments
  const studentSeatMap = new Set<string>(); // studentId
  let duplicateStudentDetected = false;
  let totalAllocated = 0;
  let totalCapacity = 0;

  const roomPlans: RoomSeatingPlan[] = [];

  // Pointers for current index in queues
  const subjectPointers: Record<string, number> = {};
  subjects.forEach((s) => {
    subjectPointers[s.id] = 0;
  });

  // 2. Iterate through rooms in order
  for (const room of rooms) {
    const roomCapacity =
      pattern === '1_PER_BENCH'
        ? room.capacityOne
        : pattern === '2_PER_BENCH'
        ? room.capacityTwo
        : room.capacityThree;

    totalCapacity += roomCapacity;

    const benches: PhysicalBench[] = [];
    let roomAllocatedCount = 0;

    // Left Side Benches (01 to leftBenches)
    for (let b = 1; b <= room.leftBenches; b++) {
      const seats: BenchPositionSeat[] = [];

      for (const pos of activePositions) {
        const targetSubjectId = positionMapping[pos];
        let assignedStudent: StudentRecord | undefined = undefined;
        let assignedSubjectName: string | undefined = undefined;

        if (targetSubjectId && queues[targetSubjectId]) {
          const ptr = subjectPointers[targetSubjectId];
          const studentList = queues[targetSubjectId];

          if (ptr < studentList.length) {
            assignedStudent = studentList[ptr];
            subjectPointers[targetSubjectId] = ptr + 1;
            assignedSubjectName = subjects.find((s) => s.id === targetSubjectId)?.name;

            if (studentSeatMap.has(assignedStudent.id)) {
              duplicateStudentDetected = true;
            } else {
              studentSeatMap.add(assignedStudent.id);
            }

            roomAllocatedCount++;
            totalAllocated++;
          }
        }

        seats.push({
          position: pos,
          student: assignedStudent,
          subjectId: assignedStudent ? targetSubjectId : undefined,
          subjectName: assignedSubjectName,
        });
      }

      benches.push({
        benchNumber: b,
        side: 'LEFT',
        seats,
      });
    }

    // Right Side Benches (01 to rightBenches)
    for (let b = 1; b <= room.rightBenches; b++) {
      const seats: BenchPositionSeat[] = [];

      for (const pos of activePositions) {
        const targetSubjectId = positionMapping[pos];
        let assignedStudent: StudentRecord | undefined = undefined;
        let assignedSubjectName: string | undefined = undefined;

        if (targetSubjectId && queues[targetSubjectId]) {
          const ptr = subjectPointers[targetSubjectId];
          const studentList = queues[targetSubjectId];

          if (ptr < studentList.length) {
            assignedStudent = studentList[ptr];
            subjectPointers[targetSubjectId] = ptr + 1;
            assignedSubjectName = subjects.find((s) => s.id === targetSubjectId)?.name;

            if (studentSeatMap.has(assignedStudent.id)) {
              duplicateStudentDetected = true;
            } else {
              studentSeatMap.add(assignedStudent.id);
            }

            roomAllocatedCount++;
            totalAllocated++;
          }
        }

        seats.push({
          position: pos,
          student: assignedStudent,
          subjectId: assignedStudent ? targetSubjectId : undefined,
          subjectName: assignedSubjectName,
        });
      }

      benches.push({
        benchNumber: b,
        side: 'RIGHT',
        seats,
      });
    }

    const vacantCount = roomCapacity - roomAllocatedCount;
    const status =
      roomAllocatedCount === roomCapacity
        ? 'Full'
        : roomAllocatedCount > 0
        ? 'Partial'
        : 'Available';

    roomPlans.push({
      roomId: room.id,
      roomNo: room.roomNo,
      leftBenches: room.leftBenches,
      rightBenches: room.rightBenches,
      totalBenches: room.totalBenches,
      capacity: roomCapacity,
      allocatedCount: roomAllocatedCount,
      vacantCount: Math.max(0, vacantCount),
      status,
      benches,
    });
  }

  // 3. Subject-wise allocation stats
  const subjectStats: SubjectAllocationStat[] = subjects.map((subj) => {
    const total = initialCounts[subj.id] || 0;
    const allocated = subjectPointers[subj.id] || 0;
    const status =
      allocated === total ? 'Complete' : allocated > 0 ? 'Partial' : 'Unallocated';

    return {
      subjectId: subj.id,
      subjectName: subj.name,
      totalStudents: total,
      allocatedCount: allocated,
      status,
    };
  });

  // 4. Strict Validation Checks
  const issues: string[] = [];
  const unallocatedStudents = Math.max(0, totalStudents - totalAllocated);
  const vacantSeats = Math.max(0, totalCapacity - totalAllocated);

  if (unallocatedStudents > 0) {
    issues.push(`${unallocatedStudents} student(s) remain unallocated due to insufficient capacity or mismatched position mappings.`);
  }

  if (duplicateStudentDetected) {
    issues.push('Critical: Duplicate student assignment detected across multiple seats.');
  }

  // Check if any room exceeds capacity
  roomPlans.forEach((rp) => {
    if (rp.allocatedCount > rp.capacity) {
      issues.push(`Room ${rp.roomNo} exceeds calculated capacity (${rp.allocatedCount} / ${rp.capacity}).`);
    }
  });

  const isReady = issues.length === 0 && unallocatedStudents === 0;

  const summary: SeatingAllocationSummary = {
    totalStudents,
    totalRooms: rooms.length,
    totalCapacity,
    allocatedStudents: totalAllocated,
    vacantSeats,
    unallocatedStudents,
    isReady,
    issues,
  };

  return {
    roomPlans,
    subjectStats,
    summary,
  };
}
