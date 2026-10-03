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
  ThreeColumnPatternConfig,
} from './student-seating-types';

export interface RunAllocationInput {
  rooms: SeatingMasterRoom[];
  subjects: StudentSubject[];
  studentsBySubject: Record<string, StudentRecord[]>;
  pattern: SeatingPattern;
  positionMapping: Record<PositionSlot, string>; // PositionSlot -> subjectId
  multiSubjectConfig?: MultiSubjectConfig;
  threeColumnConfig?: ThreeColumnPatternConfig;
}

export interface RunAllocationResult {
  roomPlans: RoomSeatingPlan[];
  subjectStats: SubjectAllocationStat[];
  summary: SeatingAllocationSummary;
}

/**
 * Deterministic, rule-based Student Seating Allocation Engine.
 * Guarantees zero unallocated students whenever total capacity is sufficient.
 * Fully supports 2-column (Left, Right) and 3-column (Left, Middle, Right) examination rooms.
 */
export function runDeterministicSeatingAllocation(input: RunAllocationInput): RunAllocationResult {
  const { rooms, subjects, studentsBySubject, pattern, positionMapping, multiSubjectConfig, threeColumnConfig } = input;

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

  // Check allocation modes
  const is3Col = Boolean(threeColumnConfig?.enabled);
  const isMultiSubject = Boolean(
    multiSubjectConfig?.enabled &&
    multiSubjectConfig.rows &&
    multiSubjectConfig.rows.length > 0
  );

  // Determine active bench positions
  const activePositions: PositionSlot[] =
    (is3Col || isMultiSubject || pattern === '3_PER_BENCH')
      ? ['SIDE_A', 'CENTER', 'SIDE_B']
      : pattern === '1_PER_BENCH'
        ? ['CENTER']
        : ['SIDE_A', 'SIDE_B'];

  // Calculate total room capacity and total benches across all rooms
  let totalCapacity = 0;
  let totalBenchesInRooms = 0;

  for (const room of rooms) {
    const roomCapacity = (isMultiSubject || is3Col)
      ? room.capacityThree
      : pattern === '1_PER_BENCH'
        ? room.capacityOne
        : pattern === '2_PER_BENCH'
          ? room.capacityTwo
          : room.capacityThree;

    totalCapacity += roomCapacity;

    const left = Math.max(0, Number(room.leftBenches) || 0);
    const middle = Math.max(0, Number(room.middleBenches) || 0);
    const right = Math.max(0, Number(room.rightBenches) || 0);
    totalBenchesInRooms += (left + middle + right);
  }

  // Tracking structures
  const studentSeatMap = new Set<string>(); // studentId
  let duplicateStudentDetected = false;
  let totalAllocated = 0;
  let benchesAllocatedSoFar = 0;

  const subjectPointers: Record<string, number> = {};
  subjects.forEach((s) => {
    subjectPointers[s.id] = 0;
  });

  const getRemainingCount = (sId: string) =>
    Math.max(0, (queues[sId]?.length || 0) - (subjectPointers[sId] || 0));

  const getTotalRemainingStudents = () =>
    subjects.reduce((sum, s) => sum + getRemainingCount(s.id), 0);

  const getRemainingSubjects = () =>
    subjects.filter((s) => getRemainingCount(s.id) > 0);

  // Take the next student from a specific subject
  const takeStudent = (sId: string): StudentRecord | undefined => {
    if (!sId || getRemainingCount(sId) <= 0) return undefined;
    const ptr = subjectPointers[sId];
    const st = queues[sId][ptr];
    subjectPointers[sId] = ptr + 1;
    if (studentSeatMap.has(st.id)) {
      duplicateStudentDetected = true;
    } else {
      studentSeatMap.add(st.id);
    }
    totalAllocated++;
    return st;
  };

  // Pick the best available subject from remaining subjects, avoiding excludedSubjectIds if possible
  const pickBestSubject = (excludedSubjectIds: (string | undefined)[] = []): string | undefined => {
    const rem = getRemainingSubjects();
    if (rem.length === 0) return undefined;

    // Filter out subjects to avoid if possible (e.g. adjacent seat subject)
    const valid = rem.filter((s) => !excludedSubjectIds.includes(s.id));
    const pool = valid.length > 0 ? valid : rem;

    // Prioritize the subject with highest remaining student count
    pool.sort((a, b) => getRemainingCount(b.id) - getRemainingCount(a.id));
    return pool[0]?.id;
  };

  // State for Multi-Subject 4-row configuration
  let currentRowIdx = 0;
  const activeRows = isMultiSubject
    ? multiSubjectConfig!.rows.filter(
        (r) =>
          r.enabled !== false &&
          ((r.sideA && r.sideA !== 'UNUSED') || (r.sideB && r.sideB !== 'UNUSED'))
      )
    : [];

  // Core Bench Allocation Function
  const allocateBench = (benchNumber: number, side: 'LEFT' | 'MIDDLE' | 'RIGHT'): PhysicalBench => {
    benchesAllocatedSoFar++;
    const remainingBenchesAhead = Math.max(1, totalBenchesInRooms - benchesAllocatedSoFar + 1);
    const seats: BenchPositionSeat[] = [];

    // All students already allocated
    if (getTotalRemainingStudents() === 0) {
      for (const pos of activePositions) {
        seats.push({
          position: pos,
          student: undefined,
          subjectId: undefined,
          subjectName: undefined,
        });
      }
      return { benchNumber, side, seats };
    }

    // -------------------------------------------------------------
    // MODE 1: THREE-COLUMN PATTERN (Left, Middle, Right custom mappings)
    // -------------------------------------------------------------
    if (is3Col && threeColumnConfig) {
      const colMap =
        side === 'LEFT'
          ? threeColumnConfig.left
          : side === 'MIDDLE'
            ? threeColumnConfig.middle
            : threeColumnConfig.right;

      // Side A
      let subjIdA = colMap?.sideA && colMap.sideA !== 'EMPTY' && colMap.sideA !== 'VACANT' && colMap.sideA !== 'UNUSED'
        ? colMap.sideA
        : undefined;
      if (!subjIdA || getRemainingCount(subjIdA) <= 0) {
        subjIdA = pickBestSubject();
      }
      const stA = subjIdA ? takeStudent(subjIdA) : undefined;
      const subjNameA = subjIdA ? subjects.find((s) => s.id === subjIdA)?.name : undefined;

      // Center
      const isCenterExplicitVacant = !colMap?.center || colMap.center === 'EMPTY' || colMap.center === 'VACANT' || colMap.center === 'NIL' || colMap.center === 'UNUSED';
      let subjIdCenter: string | undefined = undefined;
      let stCenter: StudentRecord | undefined = undefined;
      let subjNameCenter: string | undefined = undefined;

      if (!isCenterExplicitVacant && colMap?.center && getRemainingCount(colMap.center) > 0) {
        subjIdCenter = colMap.center;
        stCenter = takeStudent(subjIdCenter);
        subjNameCenter = subjects.find((s) => s.id === subjIdCenter)?.name;
      } else {
        // If center was empty or exhausted, only use Center if remaining students exceed available 2-per-bench capacity
        const needCenterForCapacity = getTotalRemainingStudents() > remainingBenchesAhead * 2;
        if (needCenterForCapacity) {
          subjIdCenter = pickBestSubject([subjIdA]);
          stCenter = subjIdCenter ? takeStudent(subjIdCenter) : undefined;
          subjNameCenter = subjIdCenter ? subjects.find((s) => s.id === subjIdCenter)?.name : undefined;
        }
      }

      // Side B
      let subjIdB = colMap?.sideB && colMap.sideB !== 'EMPTY' && colMap.sideB !== 'VACANT' && colMap.sideB !== 'UNUSED'
        ? colMap.sideB
        : undefined;
      if (!subjIdB || getRemainingCount(subjIdB) <= 0) {
        subjIdB = pickBestSubject([subjIdCenter || subjIdA]);
      }
      const stB = subjIdB ? takeStudent(subjIdB) : undefined;
      const subjNameB = subjIdB ? subjects.find((s) => s.id === subjIdB)?.name : undefined;

      seats.push({ position: 'SIDE_A', student: stA, subjectId: stA ? subjIdA : undefined, subjectName: stA ? subjNameA : undefined });
      seats.push({ position: 'CENTER', student: stCenter, subjectId: stCenter ? subjIdCenter : undefined, subjectName: stCenter ? subjNameCenter : undefined });
      seats.push({ position: 'SIDE_B', student: stB, subjectId: stB ? subjIdB : undefined, subjectName: stB ? subjNameB : undefined });

      return { benchNumber, side, seats };
    }

    // -------------------------------------------------------------
    // MODE 2: MULTI-SUBJECT SEQUENTIAL 4-ROW TRIGGER SYSTEM
    // -------------------------------------------------------------
    if (isMultiSubject) {
      // Check if only 1 subject remains unallocated in the entire exam
      const remSubjs = getRemainingSubjects();
      if (remSubjs.length === 1) {
        const soleSubj = remSubjs[0];
        const soleRem = getRemainingCount(soleSubj.id);
        const needCenter = soleRem > remainingBenchesAhead * 2;

        const stA = takeStudent(soleSubj.id);
        const stCenter = needCenter ? takeStudent(soleSubj.id) : undefined;
        const stB = takeStudent(soleSubj.id);

        seats.push({ position: 'SIDE_A', student: stA, subjectId: stA ? soleSubj.id : undefined, subjectName: stA ? soleSubj.name : undefined });
        seats.push({ position: 'CENTER', student: stCenter, subjectId: stCenter ? soleSubj.id : undefined, subjectName: stCenter ? soleSubj.name : undefined });
        seats.push({ position: 'SIDE_B', student: stB, subjectId: stB ? soleSubj.id : undefined, subjectName: stB ? soleSubj.name : undefined });

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

      // Advance row if current row's subjects have already finished
      while (currentRowIdx < activeRows.length) {
        const row = activeRows[currentRowIdx];
        const rowSubjs = [row.sideA, row.center, row.sideB].filter(
          (id): id is string => !!id && id !== 'NIL' && id !== 'VACANT' && id !== 'UNUSED'
        );
        const uniqueSubjs = Array.from(new Set(rowSubjs));
        const anyFinished = uniqueSubjs.some((id) => getRemainingCount(id) === 0);
        if (anyFinished) {
          currentRowIdx++;
        } else {
          break;
        }
      }

      let activeRow = currentRowIdx < activeRows.length ? activeRows[currentRowIdx] : null;

      // If configured rows exhausted but 2 or more subjects remain, pair them dynamically
      if (!activeRow) {
        const rem = getRemainingSubjects();
        activeRow = {
          rowNumber: currentRowIdx + 1,
          sideA: rem[0]?.id || '',
          center: 'NIL',
          sideB: rem[1]?.id || '',
        };
      }

      // Side A
      let subjIdA = activeRow.sideA && getRemainingCount(activeRow.sideA) > 0 ? activeRow.sideA : pickBestSubject();
      const stA = subjIdA ? takeStudent(subjIdA) : undefined;
      const subjNameA = subjIdA ? subjects.find((s) => s.id === subjIdA)?.name : undefined;

      // Center
      const isCenterNil = !activeRow.center || activeRow.center === 'NIL' || activeRow.center === 'VACANT' || activeRow.center === 'UNUSED';
      let subjIdCenter: string | undefined = undefined;
      let stCenter: StudentRecord | undefined = undefined;
      let subjNameCenter: string | undefined = undefined;

      if (!isCenterNil && activeRow.center && getRemainingCount(activeRow.center) > 0) {
        subjIdCenter = activeRow.center;
        stCenter = takeStudent(subjIdCenter);
        subjNameCenter = subjects.find((s) => s.id === subjIdCenter)?.name;
      } else {
        const needCenter = getTotalRemainingStudents() > remainingBenchesAhead * 2;
        if (needCenter) {
          subjIdCenter = pickBestSubject([subjIdA]);
          stCenter = subjIdCenter ? takeStudent(subjIdCenter) : undefined;
          subjNameCenter = subjIdCenter ? subjects.find((s) => s.id === subjIdCenter)?.name : undefined;
        }
      }

      // Side B
      let subjIdB = activeRow.sideB && activeRow.sideB !== 'UNUSED' && getRemainingCount(activeRow.sideB) > 0
        ? activeRow.sideB
        : pickBestSubject([subjIdCenter || subjIdA]);
      const stB = subjIdB ? takeStudent(subjIdB) : undefined;
      const subjNameB = subjIdB ? subjects.find((s) => s.id === subjIdB)?.name : undefined;

      seats.push({ position: 'SIDE_A', student: stA, subjectId: stA ? subjIdA : undefined, subjectName: stA ? subjNameA : undefined });
      seats.push({ position: 'CENTER', student: stCenter, subjectId: stCenter ? subjIdCenter : undefined, subjectName: stCenter ? subjNameCenter : undefined });
      seats.push({ position: 'SIDE_B', student: stB, subjectId: stB ? subjIdB : undefined, subjectName: stB ? subjNameB : undefined });

      // Trigger Check: move to next row if either subject finished
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
    }

    // -------------------------------------------------------------
    // MODE 3: STANDARD ALLOCATION (1, 2, or 3 per bench)
    // -------------------------------------------------------------
    const remSubjs = getRemainingSubjects();

    // Case 3A: 1 Student per Bench (CENTER only)
    if (pattern === '1_PER_BENCH') {
      let targetSubjId = positionMapping.CENTER && getRemainingCount(positionMapping.CENTER) > 0
        ? positionMapping.CENTER
        : pickBestSubject();

      const st = targetSubjId ? takeStudent(targetSubjId) : undefined;
      const subjName = targetSubjId ? subjects.find((s) => s.id === targetSubjId)?.name : undefined;

      seats.push({
        position: 'CENTER',
        student: st,
        subjectId: st ? targetSubjId : undefined,
        subjectName: st ? subjName : undefined,
      });

      return { benchNumber, side, seats };
    }

    // Case 3B: Only 1 Subject remains in 2_PER_BENCH or 3_PER_BENCH
    if (remSubjs.length === 1) {
      const soleSubj = remSubjs[0];
      const soleRem = getRemainingCount(soleSubj.id);

      if (pattern === '2_PER_BENCH') {
        const stA = takeStudent(soleSubj.id);
        const stB = takeStudent(soleSubj.id);

        seats.push({ position: 'SIDE_A', student: stA, subjectId: stA ? soleSubj.id : undefined, subjectName: stA ? soleSubj.name : undefined });
        seats.push({ position: 'SIDE_B', student: stB, subjectId: stB ? soleSubj.id : undefined, subjectName: stB ? soleSubj.name : undefined });
      } else {
        // 3_PER_BENCH: Single subject separation rule
        const needCenter = soleRem > remainingBenchesAhead * 2;
        const stA = takeStudent(soleSubj.id);
        const stCenter = needCenter ? takeStudent(soleSubj.id) : undefined;
        const stB = takeStudent(soleSubj.id);

        seats.push({ position: 'SIDE_A', student: stA, subjectId: stA ? soleSubj.id : undefined, subjectName: stA ? soleSubj.name : undefined });
        seats.push({ position: 'CENTER', student: stCenter, subjectId: stCenter ? soleSubj.id : undefined, subjectName: stCenter ? soleSubj.name : undefined });
        seats.push({ position: 'SIDE_B', student: stB, subjectId: stB ? soleSubj.id : undefined, subjectName: stB ? soleSubj.name : undefined });
      }

      return { benchNumber, side, seats };
    }

    // Case 3C: 2 or more Subjects remain in 2_PER_BENCH or 3_PER_BENCH
    // Side A
    let subjIdA = positionMapping.SIDE_A && getRemainingCount(positionMapping.SIDE_A) > 0
      ? positionMapping.SIDE_A
      : pickBestSubject();
    const stA = subjIdA ? takeStudent(subjIdA) : undefined;
    const subjNameA = subjIdA ? subjects.find((s) => s.id === subjIdA)?.name : undefined;
    seats.push({ position: 'SIDE_A', student: stA, subjectId: stA ? subjIdA : undefined, subjectName: stA ? subjNameA : undefined });

    // Center (for 3_PER_BENCH)
    let subjIdCenter: string | undefined = undefined;
    if (pattern === '3_PER_BENCH') {
      if (positionMapping.CENTER && getRemainingCount(positionMapping.CENTER) > 0) {
        subjIdCenter = positionMapping.CENTER;
      } else {
        const needCenter = getTotalRemainingStudents() > remainingBenchesAhead * 2;
        if (needCenter) {
          subjIdCenter = pickBestSubject([subjIdA]);
        }
      }
      const stCenter = subjIdCenter ? takeStudent(subjIdCenter) : undefined;
      const subjNameCenter = subjIdCenter ? subjects.find((s) => s.id === subjIdCenter)?.name : undefined;
      seats.push({ position: 'CENTER', student: stCenter, subjectId: stCenter ? subjIdCenter : undefined, subjectName: stCenter ? subjNameCenter : undefined });
    }

    // Side B
    let subjIdB = positionMapping.SIDE_B && getRemainingCount(positionMapping.SIDE_B) > 0
      ? positionMapping.SIDE_B
      : pickBestSubject([subjIdCenter || subjIdA]);
    const stB = subjIdB ? takeStudent(subjIdB) : undefined;
    const subjNameB = subjIdB ? subjects.find((s) => s.id === subjIdB)?.name : undefined;
    seats.push({ position: 'SIDE_B', student: stB, subjectId: stB ? subjIdB : undefined, subjectName: stB ? subjNameB : undefined });

    return { benchNumber, side, seats };
  };

  // -------------------------------------------------------------
  // 2. Iterate through rooms and populate physical bench columns
  // -------------------------------------------------------------
  const roomPlans: RoomSeatingPlan[] = [];

  for (const room of rooms) {
    const roomCapacity = (isMultiSubject || is3Col)
      ? room.capacityThree
      : pattern === '1_PER_BENCH'
        ? room.capacityOne
        : pattern === '2_PER_BENCH'
          ? room.capacityTwo
          : room.capacityThree;

    let roomAllocatedCount = 0;
    const benches: PhysicalBench[] = [];

    const allocateBenchForRoom = (bNum: number, side: 'LEFT' | 'MIDDLE' | 'RIGHT'): PhysicalBench => {
      const b = allocateBench(bNum, side);
      b.seats.forEach((seat) => {
        if (seat.student) roomAllocatedCount++;
      });
      return b;
    };

    // 1. Left Side Benches (01 to leftBenches)
    for (let b = 1; b <= room.leftBenches; b++) {
      benches.push(allocateBenchForRoom(b, 'LEFT'));
    }

    // 2. Middle Benches (01 to middleBenches) if middle column exists
    const middleCount = Math.max(0, Number(room.middleBenches) || 0);
    for (let b = 1; b <= middleCount; b++) {
      benches.push(allocateBenchForRoom(b, 'MIDDLE'));
    }

    // 3. Right Side Benches (01 to rightBenches)
    for (let b = 1; b <= room.rightBenches; b++) {
      benches.push(allocateBenchForRoom(b, 'RIGHT'));
    }

    const vacantCount = Math.max(0, roomCapacity - roomAllocatedCount);
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
      middleBenches: middleCount > 0 ? middleCount : undefined,
      rightBenches: room.rightBenches,
      totalBenches: room.totalBenches,
      capacity: roomCapacity,
      allocatedCount: roomAllocatedCount,
      vacantCount,
      status,
      benches,
    });
  }

  // -------------------------------------------------------------
  // 3. TIER 2 UNIVERSAL SAFETY NET: Ensure NO student is left out
  // If capacity is sufficient, sweep any vacant seats to allocate remaining students
  // -------------------------------------------------------------
  if (getTotalRemainingStudents() > 0) {
    for (const rp of roomPlans) {
      if (getTotalRemainingStudents() === 0) break;
      for (const bench of rp.benches) {
        if (getTotalRemainingStudents() === 0) break;
        for (const seat of bench.seats) {
          if (getTotalRemainingStudents() === 0) break;
          if (!seat.student) {
            const nextSubjId = pickBestSubject();
            if (nextSubjId) {
              const st = takeStudent(nextSubjId);
              if (st) {
                seat.student = st;
                seat.subjectId = nextSubjId;
                seat.subjectName = subjects.find((s) => s.id === nextSubjId)?.name;
                rp.allocatedCount++;
                rp.vacantCount = Math.max(0, rp.capacity - rp.allocatedCount);
                rp.status =
                  rp.allocatedCount === rp.capacity
                    ? 'Full'
                    : rp.allocatedCount > 0
                      ? 'Partial'
                      : 'Available';
              }
            }
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 4. Subject-wise allocation stats
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // 5. Strict Validation Checks & Summary
  // -------------------------------------------------------------
  const issues: string[] = [];
  const unallocatedStudents = Math.max(0, totalStudents - totalAllocated);
  const vacantSeats = Math.max(0, totalCapacity - totalAllocated);

  if (unallocatedStudents > 0) {
    issues.push(`${unallocatedStudents} student(s) remain unallocated due to insufficient capacity.`);
  }

  if (duplicateStudentDetected) {
    issues.push('Critical: Duplicate student assignment detected across multiple seats.');
  }

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
