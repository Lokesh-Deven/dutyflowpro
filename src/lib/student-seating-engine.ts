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
  MultiSubjectConfig,
} from './student-seating-types';

export interface RunAllocationInput {
  rooms: SeatingMasterRoom[];
  subjects: StudentSubject[];
  studentsBySubject: Record<string, StudentRecord[]>;
  pattern: SeatingPattern;
  positionMapping: Record<PositionSlot, string>; // PositionSlot -> subjectId
  multiSubjectConfig?: MultiSubjectConfig;
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

  const isMultiSubject = Boolean(
    input.multiSubjectConfig?.enabled &&
    input.multiSubjectConfig.rows &&
    input.multiSubjectConfig.rows.length > 0
  );

  let currentRowIdx = 0;
  const activeRows = isMultiSubject
    ? input.multiSubjectConfig!.rows.filter(
        (r) =>
          r.enabled !== false &&
          ((r.sideA && r.sideA !== 'UNUSED') || (r.sideB && r.sideB !== 'UNUSED'))
      )
    : [];

  // 2. Iterate through rooms in order
  for (const room of rooms) {
    const roomCapacity = isMultiSubject
      ? room.capacityThree
      : pattern === '1_PER_BENCH'
        ? room.capacityOne
        : pattern === '2_PER_BENCH'
          ? room.capacityTwo
          : room.capacityThree;

    totalCapacity += roomCapacity;

    const benches: PhysicalBench[] = [];
    let roomAllocatedCount = 0;

    const getRemainingCount = (sId: string) =>
      Math.max(0, (queues[sId]?.length || 0) - (subjectPointers[sId] || 0));

    const getRemainingSubjects = () =>
      subjects.filter((s) => getRemainingCount(s.id) > 0);

    // Multi-subject allocation for 3 or 4 subjects with sequential rows
    const allocateMultiSubjectBench = (benchNumber: number, side: 'LEFT' | 'RIGHT'): PhysicalBench => {
      const seats: BenchPositionSeat[] = [];

      // Check if all subjects in the entire exam are exhausted
      if (getRemainingSubjects().length === 0) {
        return {
          benchNumber,
          side,
          seats: [
            { position: 'SIDE_A', student: undefined },
            { position: 'CENTER', student: undefined },
            { position: 'SIDE_B', student: undefined },
          ],
        };
      }

      // Single Remaining Subject Rule (Rule #5):
      // When only one subject remains unallocated, that subject must be placed only on Side A and Side B.
      // The Centre must be set to NIL.
      if (getRemainingSubjects().length === 1) {
        const soleSubj = getRemainingSubjects()[0];
        let stA: StudentRecord | undefined = undefined;
        let stB: StudentRecord | undefined = undefined;

        if (getRemainingCount(soleSubj.id) > 0) {
          const ptr = subjectPointers[soleSubj.id];
          stA = queues[soleSubj.id][ptr];
          subjectPointers[soleSubj.id] = ptr + 1;
          studentSeatMap.add(stA.id);
          roomAllocatedCount++;
          totalAllocated++;
        }

        if (getRemainingCount(soleSubj.id) > 0) {
          const ptr = subjectPointers[soleSubj.id];
          stB = queues[soleSubj.id][ptr];
          subjectPointers[soleSubj.id] = ptr + 1;
          studentSeatMap.add(stB.id);
          roomAllocatedCount++;
          totalAllocated++;
        }

        seats.push({
          position: 'SIDE_A',
          student: stA,
          subjectId: stA ? soleSubj.id : undefined,
          subjectName: stA ? soleSubj.name : undefined,
        });

        seats.push({
          position: 'CENTER',
          student: undefined,
          subjectId: undefined,
          subjectName: undefined, // Always NIL
        });

        seats.push({
          position: 'SIDE_B',
          student: stB,
          subjectId: stB ? soleSubj.id : undefined,
          subjectName: stB ? soleSubj.name : undefined,
        });

        return {
          benchNumber,
          side,
          rowNumber: undefined,
          rowLabel: 'Single Subject',
          orderNumber: undefined,
          orderLabel: 'Single Subject',
          seats,
        };
      }

      // Multi-subject allocation (>= 2 subjects remain)
      // Advance to next row if current row's subjects have already been exhausted before this bench
      while (currentRowIdx < activeRows.length) {
        const row = activeRows[currentRowIdx];
        const rowSubjs = [row.sideA, row.center, row.sideB].filter(
          (id): id is string => !!id && id !== 'NIL' && id !== 'VACANT' && id !== 'UNUSED'
        );
        const uniqueSubjs = Array.from(new Set(rowSubjs));
        // If either subject in this row is already fully allocated, advance immediately!
        const anyFinished = uniqueSubjs.some((id) => getRemainingCount(id) === 0);
        if (anyFinished) {
          currentRowIdx++;
        } else {
          break;
        }
      }

      let activeRow = currentRowIdx < activeRows.length ? activeRows[currentRowIdx] : null;

      // If configured rows are exhausted but 2 or more subjects remain, pair them up
      if (!activeRow) {
        const rem = getRemainingSubjects();
        if (rem.length === 1) {
          return allocateMultiSubjectBench(benchNumber, side);
        }
        activeRow = {
          rowNumber: currentRowIdx + 1,
          sideA: rem[0]?.id || '',
          center: 'NIL',
          sideB: rem[1]?.id || '',
        };
      }

      // Allocate according to activeRow: Side A | Centre | Side B
      let stA: StudentRecord | undefined = undefined;
      let subjIdA: string | undefined = undefined;
      let subjNameA: string | undefined = undefined;

      if (activeRow.sideA && getRemainingCount(activeRow.sideA) > 0) {
        const ptr = subjectPointers[activeRow.sideA];
        stA = queues[activeRow.sideA][ptr];
        subjectPointers[activeRow.sideA] = ptr + 1;
        subjIdA = activeRow.sideA;
        subjNameA = subjects.find((s) => s.id === activeRow.sideA)?.name;
        studentSeatMap.add(stA.id);
        roomAllocatedCount++;
        totalAllocated++;
      }

      // Check remaining subjects after Side A
      const remAfterA = getRemainingSubjects();
      let stCenter: StudentRecord | undefined = undefined;
      let subjIdCenter: string | undefined = undefined;
      let subjNameCenter: string | undefined = undefined;

      const isCenterNil = !activeRow.center || activeRow.center === 'NIL' || activeRow.center === 'VACANT' || activeRow.center === 'UNUSED';

      // If only 1 subject remains or Side A finished the subject, Centre must be NIL
      if (!isCenterNil && remAfterA.length > 1 && getRemainingCount(activeRow.sideA) > 0) {
        if (getRemainingCount(activeRow.center) > 0) {
          const ptr = subjectPointers[activeRow.center];
          stCenter = queues[activeRow.center][ptr];
          subjectPointers[activeRow.center] = ptr + 1;
          subjIdCenter = activeRow.center;
          subjNameCenter = subjects.find((s) => s.id === activeRow.center)?.name;
          studentSeatMap.add(stCenter.id);
          roomAllocatedCount++;
          totalAllocated++;
        }
      }

      // Side B
      let stB: StudentRecord | undefined = undefined;
      let subjIdB: string | undefined = undefined;
      let subjNameB: string | undefined = undefined;

      const remAfterCenter = getRemainingSubjects();
      if (remAfterCenter.length === 1) {
        // Single Remaining Subject Rule: place on Side B if it's the remaining subject
        const sole = remAfterCenter[0];
        if (getRemainingCount(sole.id) > 0) {
          const ptr = subjectPointers[sole.id];
          stB = queues[sole.id][ptr];
          subjectPointers[sole.id] = ptr + 1;
          subjIdB = sole.id;
          subjNameB = sole.name;
          studentSeatMap.add(stB.id);
          roomAllocatedCount++;
          totalAllocated++;
        }
      } else if (activeRow.sideB && activeRow.sideB !== 'UNUSED' && getRemainingCount(activeRow.sideB) > 0) {
        const ptr = subjectPointers[activeRow.sideB];
        stB = queues[activeRow.sideB][ptr];
        subjectPointers[activeRow.sideB] = ptr + 1;
        subjIdB = activeRow.sideB;
        subjNameB = subjects.find((s) => s.id === activeRow.sideB)?.name;
        studentSeatMap.add(stB.id);
        roomAllocatedCount++;
        totalAllocated++;
      }

      seats.push({
        position: 'SIDE_A',
        student: stA,
        subjectId: subjIdA,
        subjectName: subjNameA,
      });
      seats.push({
        position: 'CENTER',
        student: stCenter,
        subjectId: subjIdCenter,
        subjectName: subjNameCenter,
      });
      seats.push({
        position: 'SIDE_B',
        student: stB,
        subjectId: subjIdB,
        subjectName: subjNameB,
      });

      // Critical Trigger Check:
      // The system must move immediately to the next row when EITHER ONE of the subjects
      // being allocated in the current row is completely allocated.
      const rowSubjs = [activeRow.sideA, activeRow.center, activeRow.sideB].filter(
        (id): id is string => !!id && id !== 'NIL' && id !== 'VACANT' && id !== 'UNUSED'
      );
      const uniqueSubjs = Array.from(new Set(rowSubjs));
      const anyFinished = uniqueSubjs.some((id) => getRemainingCount(id) === 0);
      if (anyFinished) {
        currentRowIdx++;
      }

      return {
        benchNumber,
        side,
        rowNumber: activeRow.rowNumber,
        rowLabel: `Row ${activeRow.rowNumber}`,
        orderNumber: activeRow.rowNumber,
        orderLabel: `Row ${activeRow.rowNumber}`,
        seats,
      };
    };

    // Standard 1 or 2 subject allocation
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

    if (isMultiSubject) {
      for (let b = 1; b <= room.leftBenches; b++) {
        benches.push(allocateMultiSubjectBench(b, 'LEFT'));
      }
      for (let b = 1; b <= room.rightBenches; b++) {
        benches.push(allocateMultiSubjectBench(b, 'RIGHT'));
      }
    } else {
      // Left Side Benches (01 to leftBenches)
      for (let b = 1; b <= room.leftBenches; b++) {
        benches.push(allocateSingleBench(b, 'LEFT'));
      }
      // Right Side Benches (01 to rightBenches)
      for (let b = 1; b <= room.rightBenches; b++) {
        benches.push(allocateSingleBench(b, 'RIGHT'));
      }
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
