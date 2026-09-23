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

    const allocateSingleBench = (benchNumber: number, side: 'LEFT' | 'RIGHT'): PhysicalBench => {
      const seats: BenchPositionSeat[] = [];

      // Check which subjects still have students in queue
      const remainingSubjectIds = subjects
        .map((s) => s.id)
        .filter((sId) => (subjectPointers[sId] || 0) < (queues[sId]?.length || 0));

      if (remainingSubjectIds.length === 0) {
        // All subjects exhausted - all seats on this bench are vacant
        for (const pos of activePositions) {
          seats.push({
            position: pos,
            student: undefined,
            subjectId: undefined,
            subjectName: undefined,
          });
        }
      } else if (remainingSubjectIds.length === 1 && pattern === '3_PER_BENCH') {
        // Special Single-Subject Logic (User Rule):
        // When only one subject remains, allocate 2 students per bench on SIDE_A and SIDE_B,
        // leaving the CENTER seat vacant to separate students of the same subject.
        const soleSubjId = remainingSubjectIds[0];
        const soleSubjName = subjects.find((s) => s.id === soleSubjId)?.name;
        const studentList = queues[soleSubjId];

        for (const pos of activePositions) {
          let assignedStudent: StudentRecord | undefined = undefined;
          let assignedSubjectName: string | undefined = undefined;
          let assignedSubjectId: string | undefined = undefined;

          if (pos === 'CENTER') {
            // Center is intentionally left vacant when single subject is on a 3-seat bench
            assignedStudent = undefined;
          } else {
            // SIDE_A or SIDE_B gets student if available in queue
            const ptr = subjectPointers[soleSubjId];
            if (ptr < studentList.length) {
              assignedStudent = studentList[ptr];
              subjectPointers[soleSubjId] = ptr + 1;
              assignedSubjectId = soleSubjId;
              assignedSubjectName = soleSubjName;

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
            subjectId: assignedSubjectId,
            subjectName: assignedSubjectName,
          });
        }
      } else if (remainingSubjectIds.length === 1 && pattern === '2_PER_BENCH') {
        // When only one subject remains on 2_PER_BENCH:
        // Allocate students to both SIDE_A and SIDE_B (up to 2 students per bench)
        const soleSubjId = remainingSubjectIds[0];
        const soleSubjName = subjects.find((s) => s.id === soleSubjId)?.name;
        const studentList = queues[soleSubjId];

        for (const pos of activePositions) {
          let assignedStudent: StudentRecord | undefined = undefined;
          let assignedSubjectName: string | undefined = undefined;
          let assignedSubjectId: string | undefined = undefined;

          const ptr = subjectPointers[soleSubjId];
          if (ptr < studentList.length) {
            assignedStudent = studentList[ptr];
            subjectPointers[soleSubjId] = ptr + 1;
            assignedSubjectId = soleSubjId;
            assignedSubjectName = soleSubjName;

            if (studentSeatMap.has(assignedStudent.id)) {
              duplicateStudentDetected = true;
            } else {
              studentSeatMap.add(assignedStudent.id);
            }

            roomAllocatedCount++;
            totalAllocated++;
          }

          seats.push({
            position: pos,
            student: assignedStudent,
            subjectId: assignedSubjectId,
            subjectName: assignedSubjectName,
          });
        }
      } else {
        // Standard multi-subject allocation following positionMapping
        for (const pos of activePositions) {
          const targetSubjectId = positionMapping[pos];
          let assignedStudent: StudentRecord | undefined = undefined;
          let assignedSubjectName: string | undefined = undefined;
          let assignedSubjectId: string | undefined = undefined;

          if (targetSubjectId && queues[targetSubjectId]) {
            const ptr = subjectPointers[targetSubjectId];
            const studentList = queues[targetSubjectId];

            if (ptr < studentList.length) {
              assignedStudent = studentList[ptr];
              subjectPointers[targetSubjectId] = ptr + 1;
              assignedSubjectId = targetSubjectId;
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
            subjectId: assignedSubjectId,
            subjectName: assignedSubjectName,
          });
        }
      }

      return {
        benchNumber,
        side,
        seats,
      };
    };

    // Left Side Benches (01 to leftBenches)
    for (let b = 1; b <= room.leftBenches; b++) {
      benches.push(allocateSingleBench(b, 'LEFT'));
    }

    // Right Side Benches (01 to rightBenches)
    for (let b = 1; b <= room.rightBenches; b++) {
      benches.push(allocateSingleBench(b, 'RIGHT'));
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
