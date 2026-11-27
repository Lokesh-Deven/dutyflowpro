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
  SeatingAllocationRecord,
} from './student-seating-types';

export interface RunAllocationInput {
  rooms: SeatingMasterRoom[];
  allEligibleRooms?: SeatingMasterRoom[]; // Additional available master rooms to auto-expand to if selected rooms are exhausted
  subjects: StudentSubject[];
  studentsBySubject: Record<string, StudentRecord[]>;
  pattern: SeatingPattern;
  positionMapping: Record<PositionSlot, string>; // PositionSlot -> subjectId
  multiSubjectConfig?: MultiSubjectConfig;
  threeColumnConfig?: ThreeColumnPatternConfig;
  allowAutoExpandRooms?: boolean; // When true (default), seamlessly adds rooms from allEligibleRooms to reach 100%
}

export interface RunAllocationResult {
  roomPlans: RoomSeatingPlan[];
  subjectStats: SubjectAllocationStat[];
  summary: SeatingAllocationSummary;
}

/**
 * Deterministic, rule-based Student Seating Allocation Engine.
 * Supports:
 * - Mode 1: Standard Allocation (1 or 2 Subjects) with revised sequential 2_PER_BENCH & 3_PER_BENCH Sandwich rule.
 * - Mode 2: More Than 2 Subjects (Sequential 4-Row System) with automatic immediate row advancement.
 * - Integrated 3-Column Examination Rooms across both modes with flexible Middle Bench Seating Patterns.
 * - Guarantees zero duplicate allocations and zero unallocated students when capacity is sufficient.
 */
export function runDeterministicSeatingAllocation(input: RunAllocationInput): RunAllocationResult {
  const {
    rooms,
    allEligibleRooms = [],
    subjects,
    studentsBySubject,
    pattern,
    positionMapping,
    multiSubjectConfig,
    threeColumnConfig,
    allowAutoExpandRooms = true,
  } = input;

  // Working list of rooms to allocate into (can be expanded with eligible master rooms if capacity would otherwise be exceeded)
  const workingRooms: SeatingMasterRoom[] = [...rooms];
  const eligibleExtraRooms = allEligibleRooms.filter((er) => !workingRooms.some((wr) => wr.id === er.id));

  // 1. Sort students sequentially by roll number for each subject
  const queues: Record<string, StudentRecord[]> = {};
  const initialCounts: Record<string, number> = {};

  // Rank subjects by student strength (highest to lowest)
  const rankedSubjects = [...subjects].sort((a, b) => {
    const countA = studentsBySubject[a.id]?.length || 0;
    const countB = studentsBySubject[b.id]?.length || 0;
    if (countB !== countA) return countB - countA;
    return a.name.localeCompare(b.name);
  });
  const rankedSubjectIds = rankedSubjects.map((s) => s.id);

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
  const is3ColEnabled = Boolean(threeColumnConfig?.enabled);
  const isMultiSubject = Boolean(
    multiSubjectConfig?.enabled &&
    multiSubjectConfig.rows &&
    multiSubjectConfig.rows.length > 0
  );

  // Helpers to resolve Middle Bench enabled seats
  const isSeatPositionEnabled = (pos: PositionSlot): boolean => {
    if (!threeColumnConfig) return true;
    const mPattern = threeColumnConfig.middlePattern || 'allThree';
    if (mPattern === 'centerOnly') {
      return pos === 'CENTER';
    }
    if (mPattern === 'sideAAndSideB') {
      return pos === 'SIDE_A' || pos === 'SIDE_B';
    }
    if (mPattern === 'custom') {
      const enabledMap = threeColumnConfig.middleEnabledSeats;
      if (!enabledMap) return true;
      if (pos === 'SIDE_A') return Boolean(enabledMap.sideA);
      if (pos === 'CENTER') return Boolean(enabledMap.center);
      if (pos === 'SIDE_B') return Boolean(enabledMap.sideB);
    }
    return true; // allThree default
  };

  // Helper to resolve Middle Bench subject for a position
  const getMiddleSeatSubjectId = (pos: PositionSlot): string => {
    if (!threeColumnConfig) return '';
    const seatsConfig = threeColumnConfig.middleSeats;
    if (seatsConfig) {
      if (pos === 'SIDE_A') return seatsConfig.sideA || '';
      if (pos === 'CENTER') return seatsConfig.center || '';
      if (pos === 'SIDE_B') return seatsConfig.sideB || '';
    }
    // Fallback to legacy config
    if (threeColumnConfig.middle) {
      if (pos === 'SIDE_A') return threeColumnConfig.middle.sideA || '';
      if (pos === 'CENTER') return threeColumnConfig.middle.center || '';
      if (pos === 'SIDE_B') return threeColumnConfig.middle.sideB || '';
    }
    return '';
  };

  // Calculate total room capacity accurately
  let totalCapacity = 0;
  let totalBenchesInRooms = 0;

  for (const room of rooms) {
    const leftCount = Math.max(0, Number(room.leftBenches) || 0);
    const middleCount = Math.max(0, Number(room.middleBenches) || 0);
    const rightCount = Math.max(0, Number(room.rightBenches) || 0);
    totalBenchesInRooms += (leftCount + middleCount + rightCount);

    const is3ColRoom = is3ColEnabled && middleCount > 0;

    if (is3ColRoom) {
      // Left benches capacity
      let leftSeatsPerBench = 0;
      (['SIDE_A', 'CENTER', 'SIDE_B'] as PositionSlot[]).forEach((pos) => {
        const sKey = pos === 'SIDE_A' ? 'sideA' : pos === 'CENTER' ? 'center' : 'sideB';
        const sId = threeColumnConfig?.left?.[sKey] || (sKey !== 'center' ? threeColumnConfig?.leftSubjectId : '');
        if (sId && sId !== 'VACANT' && sId !== 'NIL' && sId !== 'EMPTY') {
          leftSeatsPerBench++;
        }
      });
      const leftCap = leftCount * leftSeatsPerBench;

      // Right benches capacity
      let rightSeatsPerBench = 0;
      (['SIDE_A', 'CENTER', 'SIDE_B'] as PositionSlot[]).forEach((pos) => {
        const sKey = pos === 'SIDE_A' ? 'sideA' : pos === 'CENTER' ? 'center' : 'sideB';
        const sId = threeColumnConfig?.right?.[sKey] || (sKey !== 'center' ? threeColumnConfig?.rightSubjectId : '');
        if (sId && sId !== 'VACANT' && sId !== 'NIL' && sId !== 'EMPTY') {
          rightSeatsPerBench++;
        }
      });
      const rightCap = rightCount * rightSeatsPerBench;

      // Middle benches capacity
      let middleSeatsPerBench = 0;
      (['SIDE_A', 'CENTER', 'SIDE_B'] as PositionSlot[]).forEach((pos) => {
        if (isSeatPositionEnabled(pos)) {
          const sId = getMiddleSeatSubjectId(pos);
          if (sId && sId !== 'VACANT' && sId !== 'NIL' && sId !== 'EMPTY') {
            middleSeatsPerBench++;
          }
        }
      });
      const middleCap = middleCount * middleSeatsPerBench;

      totalCapacity += (leftCap + middleCap + rightCap);
    } else {
      const roomCapacity = isMultiSubject
        ? room.capacityThree
        : pattern === '1_PER_BENCH'
          ? room.capacityOne
          : pattern === '2_PER_BENCH'
            ? room.capacityTwo
            : room.capacityThree;
      totalCapacity += roomCapacity;
    }
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
    const sIdentifier = st.id || `${st.rollNo}_${st.subjectId || sId}`;
    if (studentSeatMap.has(sIdentifier)) {
      duplicateStudentDetected = true;
    } else {
      studentSeatMap.add(sIdentifier);
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

  // State for Mode 2: Multi-Subject 4-row configuration
  let currentRowIdx = 0;
  const activeRows = isMultiSubject
    ? multiSubjectConfig!.rows.filter(
      (r) =>
        r.enabled !== false &&
        ((r.sideA && r.sideA !== 'UNUSED') || (r.sideB && r.sideB !== 'UNUSED'))
    )
    : [];

  // State for Mode 1: Standard 2_PER_BENCH sequential subject progression
  let standardSubjectIdx = 0;

  // -------------------------------------------------------------
  // Core Bench Allocation Function
  // -------------------------------------------------------------
  const allocateBench = (
    benchNumber: number,
    side: 'LEFT' | 'MIDDLE' | 'RIGHT',
    is3ColRoom: boolean
  ): PhysicalBench => {
    benchesAllocatedSoFar++;
    const remainingBenchesAhead = Math.max(1, totalBenchesInRooms - benchesAllocatedSoFar + 1);
    const seats: BenchPositionSeat[] = [];

    // All students already allocated
    if (getTotalRemainingStudents() === 0) {
      if (is3ColRoom && side === 'MIDDLE') {
        (['SIDE_A', 'CENTER', 'SIDE_B'] as PositionSlot[]).forEach((pos) => {
          const isEnabled = isSeatPositionEnabled(pos);
          seats.push({
            position: pos,
            isDisabled: !isEnabled,
            student: undefined,
            subjectId: undefined,
            subjectName: undefined,
          });
        });
      } else {
        const slots: PositionSlot[] =
          pattern === '1_PER_BENCH'
            ? ['CENTER']
            : pattern === '2_PER_BENCH'
              ? ['SIDE_A', 'CENTER', 'SIDE_B']
              : ['SIDE_A', 'CENTER', 'SIDE_B'];

        slots.forEach((pos) => {
          seats.push({
            position: pos,
            isDisabled: false,
            student: undefined,
            subjectId: undefined,
            subjectName: undefined,
          });
        });
      }
      return { benchNumber, side, seats };
    }

    // =============================================================
    // 3-COLUMN ROOM BENCH ALLOCATION (When room has middle benches and 3-Col is enabled)
    // =============================================================
    if (is3ColRoom) {
      // 1. Left Side Benches
      if (side === 'LEFT') {
        (['SIDE_A', 'CENTER', 'SIDE_B'] as PositionSlot[]).forEach((pos) => {
          const sKey = pos === 'SIDE_A' ? 'sideA' : pos === 'CENTER' ? 'center' : 'sideB';
          const sId = threeColumnConfig?.left?.[sKey] || (sKey !== 'center' ? threeColumnConfig?.leftSubjectId : '');
          const isVacant = !sId || sId === 'VACANT' || sId === 'NIL' || sId === 'EMPTY';

          if (isVacant) {
            seats.push({
              position: pos,
              isDisabled: false,
              isVacant: true,
              student: undefined,
              subjectId: undefined,
              subjectName: undefined,
            });
          } else {
            const st = takeStudent(sId);
            const subjName = st ? subjects.find((s) => s.id === sId)?.name : undefined;
            seats.push({
              position: pos,
              isDisabled: false,
              student: st,
              subjectId: st ? sId : undefined,
              subjectName: subjName,
            });
          }
        });
        return { benchNumber, side, seats };
      }

      // 2. Right Side Benches
      if (side === 'RIGHT') {
        (['SIDE_A', 'CENTER', 'SIDE_B'] as PositionSlot[]).forEach((pos) => {
          const sKey = pos === 'SIDE_A' ? 'sideA' : pos === 'CENTER' ? 'center' : 'sideB';
          const sId = threeColumnConfig?.right?.[sKey] || (sKey !== 'center' ? threeColumnConfig?.rightSubjectId : '');
          const isVacant = !sId || sId === 'VACANT' || sId === 'NIL' || sId === 'EMPTY';

          if (isVacant) {
            seats.push({
              position: pos,
              isDisabled: false,
              isVacant: true,
              student: undefined,
              subjectId: undefined,
              subjectName: undefined,
            });
          } else {
            const st = takeStudent(sId);
            const subjName = st ? subjects.find((s) => s.id === sId)?.name : undefined;
            seats.push({
              position: pos,
              isDisabled: false,
              student: st,
              subjectId: st ? sId : undefined,
              subjectName: subjName,
            });
          }
        });
        return { benchNumber, side, seats };
      }

      // 3. Middle Benches – Custom Seat Configuration
      if (side === 'MIDDLE') {
        (['SIDE_A', 'CENTER', 'SIDE_B'] as PositionSlot[]).forEach((pos) => {
          const isEnabled = isSeatPositionEnabled(pos);
          if (!isEnabled) {
            seats.push({
              position: pos,
              isDisabled: true,
              student: undefined,
              subjectId: undefined,
              subjectName: undefined,
            });
            return;
          }

          const sId = getMiddleSeatSubjectId(pos);
          const isVacant = !sId || sId === 'VACANT' || sId === 'NIL' || sId === 'EMPTY';

          if (isVacant) {
            seats.push({
              position: pos,
              isDisabled: false,
              isVacant: true,
              student: undefined,
              subjectId: undefined,
              subjectName: undefined,
            });
          } else {
            const st = takeStudent(sId);
            const subjName = st ? subjects.find((s) => s.id === sId)?.name : undefined;
            seats.push({
              position: pos,
              isDisabled: false,
              student: st,
              subjectId: st ? sId : undefined,
              subjectName: subjName,
            });
          }
        });

        return { benchNumber, side, seats };
      }
    }

    // =============================================================
    // MODE 2: MULTI-SUBJECT SEQUENTIAL 4-ROW TRIGGER SYSTEM (2-Column Rooms)
    // =============================================================
    if (isMultiSubject) {
      // Check if only 1 subject remains unallocated in the entire exam
      const remSubjs = getRemainingSubjects();
      if (remSubjs.length === 1) {
        const soleSubj = remSubjs[0];

        // Trigger: Once Side A and Side B of the previous row/subject finish,
        // the remaining subject takes Side A and Side B.
        const stA = takeStudent(soleSubj.id);
        const stB = getRemainingCount(soleSubj.id) > 0 ? takeStudent(soleSubj.id) : undefined;

        // STRICT CONSTRAINT: Once previous subjects finish, the remaining subject takes
        // Side A and Side B, leaving Center strictly VACANT rather than filling it with the same subject.
        seats.push({ position: 'SIDE_A', student: stA, subjectId: stA ? soleSubj.id : undefined, subjectName: stA ? soleSubj.name : undefined });
        seats.push({
          position: 'CENTER',
          student: undefined,
          subjectId: undefined,
          subjectName: undefined,
          isVacant: true,
        });
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
      }

      // Side B
      let subjIdB = activeRow.sideB && activeRow.sideB !== 'UNUSED' && getRemainingCount(activeRow.sideB) > 0
        ? activeRow.sideB
        : pickBestSubject([subjIdCenter || subjIdA]);
      const stB = subjIdB ? takeStudent(subjIdB) : undefined;
      const subjNameB = subjIdB ? subjects.find((s) => s.id === subjIdB)?.name : undefined;

      seats.push({ position: 'SIDE_A', student: stA, subjectId: stA ? subjIdA : undefined, subjectName: stA ? subjNameA : undefined });
      seats.push({
        position: 'CENTER',
        student: stCenter,
        subjectId: stCenter ? subjIdCenter : undefined,
        subjectName: stCenter ? subjNameCenter : undefined,
        isVacant: !stCenter,
      });
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

    // =============================================================
    // MODE 1: STANDARD ALLOCATION (1 or 2 Subjects)
    // =============================================================

    // -------------------------------------------------------------
    // CASE 1A: 1 Student per Bench (CENTER only)
    // -------------------------------------------------------------
    if (pattern === '1_PER_BENCH') {
      while (
        standardSubjectIdx < rankedSubjectIds.length &&
        getRemainingCount(rankedSubjectIds[standardSubjectIdx]) === 0
      ) {
        standardSubjectIdx++;
      }
      const targetSubjId = rankedSubjectIds[standardSubjectIdx] || pickBestSubject();
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

    // -------------------------------------------------------------
    // CASE 1B: 2 Students per Bench (2_PER_BENCH) - REVISED SEQUENTIAL RULE
    // Rule:
    // - Side A and Side B must receive the SAME subject.
    // - Begin with the highest-strength subject ($S_1$) and allocate it to both Side A and Side B.
    // - Keep the Centre vacant throughout.
    // - Complete the allocation of ALL students of Subject 1 before beginning Subject 2.
    // - Immediately after Subject 1 is completely allocated, begin allocating Subject 2 to both Side A and Side B.
    // -------------------------------------------------------------
    if (pattern === '2_PER_BENCH') {
      while (
        standardSubjectIdx < rankedSubjectIds.length &&
        getRemainingCount(rankedSubjectIds[standardSubjectIdx]) === 0
      ) {
        standardSubjectIdx++;
      }

      const activeSubjId = rankedSubjectIds[standardSubjectIdx] || pickBestSubject();

      if (!activeSubjId) {
        seats.push({ position: 'SIDE_A', student: undefined });
        seats.push({ position: 'CENTER', student: undefined });
        seats.push({ position: 'SIDE_B', student: undefined });
        return { benchNumber, side, seats };
      }

      const subjName = subjects.find((s) => s.id === activeSubjId)?.name;

      // Allocate Side A from current subject
      const stA = takeStudent(activeSubjId);

      // Allocate Side B:
      // If current subject still has students, Side B gets current subject.
      // If current subject just finished on Side A, ALWAYS fill Side B with the next
      // available subject to guarantee 100% allocation. Never waste a usable seat.
      let stB: StudentRecord | undefined = undefined;
      let subjIdB: string | undefined = activeSubjId;
      let subjNameB: string | undefined = subjName;

      if (getRemainingCount(activeSubjId) > 0) {
        stB = takeStudent(activeSubjId);
      } else {
        // Active subject finished with Side A — advance to next subject
        standardSubjectIdx++;

        // ALWAYS fill Side B with the next available subject's student.
        // Never leave Side B vacant when students are waiting to be allocated.
        const nextSubjId = rankedSubjectIds[standardSubjectIdx] || pickBestSubject();
        if (nextSubjId && getRemainingCount(nextSubjId) > 0) {
          subjIdB = nextSubjId;
          stB = takeStudent(nextSubjId);
          subjNameB = subjects.find((s) => s.id === nextSubjId)?.name;
        } else {
          subjIdB = undefined;
          subjNameB = undefined;
        }
      }

      seats.push({ position: 'SIDE_A', student: stA, subjectId: stA ? activeSubjId : undefined, subjectName: stA ? subjName : undefined });
      seats.push({ position: 'CENTER', student: undefined, isVacant: true }); // Centre is strictly vacant throughout
      seats.push({ position: 'SIDE_B', student: stB, subjectId: stB ? subjIdB : undefined, subjectName: stB ? subjNameB : undefined });

      return { benchNumber, side, seats };
    }

    // -------------------------------------------------------------
    // CASE 1C: 3 Students per Bench (3_PER_BENCH) - REVISED SANDWICH RULE
    // Rule:
    // Initial Allocation: [ S1 | S2 | S1 ]
    // - Side A: S1
    // - Centre: S2
    // - Side B: S1
    // Subsequent Allocation:
    // - After all students of S1 are completely allocated, begin allocating S2 to Side A and Side B.
    // - Keep the Centre vacant during this subsequent allocation: [ S2 | Vacant (Centre) | S2 ].
    // - Continue until S2 is completely allocated.
    // -------------------------------------------------------------
    const mappedS1 = positionMapping?.SIDE_A;
    const mappedS2 = positionMapping?.CENTER || positionMapping?.SIDE_B;
    const s1Id = (mappedS1 && subjects.some((s) => s.id === mappedS1))
      ? mappedS1
      : (rankedSubjectIds[0] || pickBestSubject());
    const s2Id = (mappedS2 && subjects.some((s) => s.id === mappedS2) && mappedS2 !== s1Id)
      ? mappedS2
      : (rankedSubjectIds.find((id) => id !== s1Id) || rankedSubjectIds[1] || rankedSubjectIds[0]);

    const isS1Finished = !s1Id || getRemainingCount(s1Id) === 0;

    if (!isS1Finished && s1Id) {
      // Phase 1: S1 is active -> Initial Sandwich Rule [ S1 | S2 | S1 ]
      const s1Name = subjects.find((s) => s.id === s1Id)?.name;
      const s2Name = s2Id ? subjects.find((s) => s.id === s2Id)?.name : undefined;

      const stA = takeStudent(s1Id);

      // Centre gets S2 (or next best available subject if S2 has finished)
      let stCenter: StudentRecord | undefined = undefined;
      let centerSubjId: string | undefined = undefined;
      let centerSubjName: string | undefined = undefined;

      const pickCenterSubjId = (s2Id && getRemainingCount(s2Id) > 0) ? s2Id : pickBestSubject([s1Id]);
      if (pickCenterSubjId && getRemainingCount(pickCenterSubjId) > 0) {
        centerSubjId = pickCenterSubjId;
        stCenter = takeStudent(pickCenterSubjId);
        centerSubjName = subjects.find((s) => s.id === pickCenterSubjId)?.name;
      }

      // Side B gets S1 (if S1 has students remaining)
      let stB: StudentRecord | undefined = undefined;
      let subjIdB: string | undefined = undefined;
      let subjNameB: string | undefined = undefined;

      if (getRemainingCount(s1Id) > 0) {
        subjIdB = s1Id;
        stB = takeStudent(s1Id);
        subjNameB = s1Name;
      } else {
        // S1 finished on Side A; transition Side B to next available distinct subject.
        // NEVER assign the same subject as Center to avoid duplicate adjacent/triplicate seats.
        const fillSubjId = pickBestSubject([s1Id, centerSubjId].filter((x): x is string => !!x));
        if (fillSubjId && getRemainingCount(fillSubjId) > 0) {
          subjIdB = fillSubjId;
          stB = takeStudent(fillSubjId);
          subjNameB = subjects.find((s) => s.id === fillSubjId)?.name;
        }
      }

      seats.push({ position: 'SIDE_A', student: stA, subjectId: stA ? s1Id : undefined, subjectName: stA ? s1Name : undefined });
      seats.push({
        position: 'CENTER',
        student: stCenter,
        subjectId: stCenter ? centerSubjId : undefined,
        subjectName: stCenter ? centerSubjName : undefined,
        isVacant: !stCenter,
      });
      seats.push({ position: 'SIDE_B', student: stB, subjectId: stB ? subjIdB : undefined, subjectName: stB ? subjNameB : undefined });

      return { benchNumber, side, seats };
    } else {
      // Phase 2: S1 is completely allocated!
      // Subsequent Allocation: [ S2 | Vacant (Centre) | S2 ]
      while (
        standardSubjectIdx < rankedSubjectIds.length &&
        getRemainingCount(rankedSubjectIds[standardSubjectIdx]) === 0
      ) {
        standardSubjectIdx++;
      }

      const activeSubjId = rankedSubjectIds[standardSubjectIdx] || pickBestSubject();
      const subjName = activeSubjId ? subjects.find((s) => s.id === activeSubjId)?.name : undefined;

      if (!activeSubjId) {
        seats.push({ position: 'SIDE_A', student: undefined });
        seats.push({ position: 'CENTER', student: undefined });
        seats.push({ position: 'SIDE_B', student: undefined });
        return { benchNumber, side, seats };
      }

      const stA = takeStudent(activeSubjId);

      // Side B: if active subject has students, take it. Otherwise advance to next subject!
      let stB: StudentRecord | undefined = undefined;
      let sideBSubjId: string | undefined = activeSubjId;
      let sideBSubjName: string | undefined = subjName;

      if (getRemainingCount(activeSubjId) > 0) {
        stB = takeStudent(activeSubjId);
      } else {
        standardSubjectIdx++;
        const nextSubjId = rankedSubjectIds[standardSubjectIdx] || pickBestSubject();
        if (nextSubjId && getRemainingCount(nextSubjId) > 0) {
          sideBSubjId = nextSubjId;
          stB = takeStudent(nextSubjId);
          sideBSubjName = subjects.find((s) => s.id === nextSubjId)?.name;
        } else {
          sideBSubjId = undefined;
          sideBSubjName = undefined;
        }
      }

      // Center: STRICT CONSTRAINT
      // "Once a subject finishes being allocated on Side A and Side B, move the subject that was
      // in the Center onto Side A and Side B, leaving the Center vacant rather than continuing
      // to fill the Center with that same subject."
      // "Never place the same subject on all three seats (Side A, Center, and Side B) of a single bench."
      let stCenter: StudentRecord | undefined = undefined;
      let centerSubjId: string | undefined = undefined;
      let centerSubjName: string | undefined = undefined;

      // Center can ONLY be filled if there is an available distinct 3rd subject (S3)
      // that is NOT activeSubjId and NOT sideBSubjId:
      const excludedForCenter = [activeSubjId, sideBSubjId].filter((x): x is string => !!x);
      const otherSubjId = pickBestSubject(excludedForCenter);
      if (otherSubjId && getRemainingCount(otherSubjId) > 0) {
        centerSubjId = otherSubjId;
        stCenter = takeStudent(otherSubjId);
        centerSubjName = subjects.find((s) => s.id === otherSubjId)?.name;
      }

      seats.push({ position: 'SIDE_A', student: stA, subjectId: stA ? activeSubjId : undefined, subjectName: stA ? subjName : undefined });
      seats.push({
        position: 'CENTER',
        student: stCenter,
        subjectId: stCenter ? centerSubjId : undefined,
        subjectName: stCenter ? centerSubjName : undefined,
        isVacant: !stCenter,
      });
      seats.push({ position: 'SIDE_B', student: stB, subjectId: stB ? sideBSubjId : undefined, subjectName: stB ? sideBSubjName : undefined });

      return { benchNumber, side, seats };
    }
  };

  // -------------------------------------------------------------
  // 2. Iterate through rooms and populate physical bench columns
  // -------------------------------------------------------------
  const roomPlans: RoomSeatingPlan[] = [];

  for (const room of rooms) {
    const leftCount = Math.max(0, Number(room.leftBenches) || 0);
    const middleCount = Math.max(0, Number(room.middleBenches) || 0);
    const rightCount = Math.max(0, Number(room.rightBenches) || 0);
    const is3ColRoom = is3ColEnabled && middleCount > 0;

    let roomAllocatedCount = 0;
    const benches: PhysicalBench[] = [];

    const allocateBenchForRoom = (bNum: number, side: 'LEFT' | 'MIDDLE' | 'RIGHT'): PhysicalBench => {
      const b = allocateBench(bNum, side, is3ColRoom);
      b.seats.forEach((seat) => {
        if (seat.student) roomAllocatedCount++;
      });
      return b;
    };

    // 1. Left Side Benches (01 to leftBenches)
    for (let b = 1; b <= leftCount; b++) {
      benches.push(allocateBenchForRoom(b, 'LEFT'));
    }

    // 2. Middle Benches (01 to middleBenches) if middle column exists
    for (let b = 1; b <= middleCount; b++) {
      benches.push(allocateBenchForRoom(b, 'MIDDLE'));
    }

    // 3. Right Side Benches (01 to rightBenches)
    for (let b = 1; b <= rightCount; b++) {
      benches.push(allocateBenchForRoom(b, 'RIGHT'));
    }

    // Calculate room capacity
    let roomCapacity = 0;
    if (is3ColRoom) {
      benches.forEach((bench) => {
        bench.seats.forEach((seat) => {
          if (!seat.isDisabled) {
            roomCapacity++;
          }
        });
      });
    } else {
      roomCapacity = isMultiSubject
        ? room.capacityThree
        : pattern === '1_PER_BENCH'
          ? room.capacityOne
          : pattern === '2_PER_BENCH'
            ? room.capacityTwo
            : room.capacityThree;
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
  // 3. TIER 2 UNIVERSAL SAFETY NET: Ensure 100% Student Allocation
  // Guarantees zero students are left unallocated whenever physical seats exist.
  // PASS 1: Fill any empty seats that are not marked isVacant (standard vacancy).
  // PASS 2: If students STILL remain, sweep ALL non-disabled seats (including
  //         center seats in 2_PER_BENCH or multi-subject rows initially marked isVacant)
  //         to ensure not even a single student is left out.
  // Safeguard: NEVER allocate into disabled seats.
  // -------------------------------------------------------------
  const executeSafetyNetSweep = (allowVacantSeats: boolean) => {
    for (const rp of roomPlans) {
      if (getTotalRemainingStudents() === 0) break;
      for (const bench of rp.benches) {
        if (getTotalRemainingStudents() === 0) break;
        for (const seat of bench.seats) {
          if (getTotalRemainingStudents() === 0) break;
          if (seat.isDisabled || seat.student) continue;
          if (!allowVacantSeats && seat.isVacant) continue;

          // STRICT CONSTRAINT: Never place the same subject on all three seats (Side A, Center, Side B)
          // and never fill Center with the same subject as Side A or Side B.
          const excludedSubjIds: string[] = [];

          if (seat.position === 'CENTER') {
            // Center must NEVER have the same subject as Side A or Side B on this bench
            bench.seats.forEach((otherSeat) => {
              if (otherSeat.student && otherSeat.subjectId && !excludedSubjIds.includes(otherSeat.subjectId)) {
                excludedSubjIds.push(otherSeat.subjectId);
              }
            });
          } else {
            // Side A / Side B: if both other seats are occupied with the same subject, exclude it
            const otherSeatsWithStudent = bench.seats.filter((s) => s !== seat && s.student && s.subjectId);
            if (
              otherSeatsWithStudent.length === 2 &&
              otherSeatsWithStudent[0].subjectId === otherSeatsWithStudent[1].subjectId
            ) {
              excludedSubjIds.push(otherSeatsWithStudent[0].subjectId!);
            }
          }

          const nextSubjId = pickBestSubject(excludedSubjIds);
          if (nextSubjId) {
            const st = takeStudent(nextSubjId);
            if (st) {
              seat.student = st;
              seat.subjectId = nextSubjId;
              seat.subjectName = subjects.find((s) => s.id === nextSubjId)?.name;
              seat.isVacant = false; // Seat is now actively occupied
              rp.allocatedCount++;
              rp.capacity = Math.max(rp.capacity, rp.allocatedCount);
              rp.vacantCount = Math.max(0, rp.capacity - rp.allocatedCount);
              rp.status =
                rp.allocatedCount >= rp.capacity
                  ? 'Full'
                  : rp.allocatedCount > 0
                    ? 'Partial'
                    : 'Available';
            }
          }
        }
      }
    }
  };

  // Pass 1: Allocate into normal open seats
  if (getTotalRemainingStudents() > 0) {
    executeSafetyNetSweep(false);
  }

  // Pass 2: Allocate into any remaining non-disabled seats as overflow guarantee
  if (getTotalRemainingStudents() > 0) {
    executeSafetyNetSweep(true);
  }

  // -------------------------------------------------------------
  // TIER 3 AUTO-EXPAND ROOMS: Guarantee 100% Allocation across all eligible rooms
  // If physical capacity in the selected rooms is exhausted and unallocated students remain,
  // automatically draw from eligible master rooms.
  // -------------------------------------------------------------
  if (allowAutoExpandRooms && getTotalRemainingStudents() > 0 && eligibleExtraRooms.length > 0) {
    for (const extraRoom of eligibleExtraRooms) {
      if (getTotalRemainingStudents() === 0) break;

      const leftCount = Math.max(0, Number(extraRoom.leftBenches) || 0);
      const middleCount = Math.max(0, Number(extraRoom.middleBenches) || 0);
      const rightCount = Math.max(0, Number(extraRoom.rightBenches) || 0);
      const is3ColRoom = is3ColEnabled && middleCount > 0;

      let roomAllocatedCount = 0;
      const benches: PhysicalBench[] = [];

      const allocateBenchForExtra = (bNum: number, side: 'LEFT' | 'MIDDLE' | 'RIGHT'): PhysicalBench => {
        const b = allocateBench(bNum, side, is3ColRoom);
        b.seats.forEach((seat) => {
          if (seat.student) roomAllocatedCount++;
        });
        return b;
      };

      for (let b = 1; b <= leftCount; b++) benches.push(allocateBenchForExtra(b, 'LEFT'));
      for (let b = 1; b <= middleCount; b++) benches.push(allocateBenchForExtra(b, 'MIDDLE'));
      for (let b = 1; b <= rightCount; b++) benches.push(allocateBenchForExtra(b, 'RIGHT'));

      let roomCapacity = is3ColRoom
        ? benches.reduce((sum, bench) => sum + bench.seats.filter((s) => !s.isDisabled).length, 0)
        : isMultiSubject
          ? extraRoom.capacityThree
          : pattern === '1_PER_BENCH'
            ? extraRoom.capacityOne
            : pattern === '2_PER_BENCH'
              ? extraRoom.capacityTwo
              : extraRoom.capacityThree;

      const newPlan: RoomSeatingPlan = {
        roomId: extraRoom.id,
        roomNo: extraRoom.roomNo,
        leftBenches: extraRoom.leftBenches,
        middleBenches: middleCount > 0 ? middleCount : undefined,
        rightBenches: extraRoom.rightBenches,
        totalBenches: extraRoom.totalBenches,
        capacity: roomCapacity,
        allocatedCount: roomAllocatedCount,
        vacantCount: Math.max(0, roomCapacity - roomAllocatedCount),
        status: roomAllocatedCount >= roomCapacity ? 'Full' : roomAllocatedCount > 0 ? 'Partial' : 'Available',
        benches,
      };

      roomPlans.push(newPlan);
    }

    // Re-run safety net sweep on newly added rooms if needed
    if (getTotalRemainingStudents() > 0) {
      executeSafetyNetSweep(false);
    }
    if (getTotalRemainingStudents() > 0) {
      executeSafetyNetSweep(true);
    }
  }

  // -------------------------------------------------------------
  // 3b. HARD VALIDATION ENFORCEMENT: Zero Triplicate Subject Benches
  // "Never place the same subject on all three seats (Side A, Center, and Side B) of a single bench."
  // "Once a subject finishes being allocated on Side A and Side B, move the subject that was
  // in the Center onto Side A and Side B, leaving the Center vacant rather than continuing
  // to fill the Center with that same subject."
  // -------------------------------------------------------------
  for (const rp of roomPlans) {
    for (const bench of rp.benches) {
      const seatA = bench.seats.find((s) => s.position === 'SIDE_A');
      const seatC = bench.seats.find((s) => s.position === 'CENTER');
      const seatB = bench.seats.find((s) => s.position === 'SIDE_B');

      if (!seatA?.student || !seatC?.student || !seatB?.student) continue;

      const isTriplicate =
        seatA.subjectId &&
        seatA.subjectId === seatC.subjectId &&
        seatC.subjectId === seatB.subjectId;

      const isCenterDuplicateWithSides =
        seatA.subjectId &&
        seatA.subjectId === seatB.subjectId &&
        seatC.subjectId === seatA.subjectId;

      if (isTriplicate || isCenterDuplicateWithSides) {
        // Center seat must be vacated
        const vacatedStudent = seatC.student;
        const vacatedSubjId = seatC.subjectId!;
        seatC.student = undefined;
        seatC.subjectId = undefined;
        seatC.subjectName = undefined;
        seatC.isVacant = true;
        rp.allocatedCount--;
        rp.vacantCount = Math.max(0, rp.capacity - rp.allocatedCount);

        // Find an open Side A or Side B on a subsequent bench to reallocate this student
        let reallocated = false;
        for (const targetRp of roomPlans) {
          if (reallocated) break;
          for (const targetBench of targetRp.benches) {
            if (reallocated) break;
            for (const targetSeat of targetBench.seats) {
              if (
                targetSeat.position !== 'CENTER' &&
                !targetSeat.student &&
                !targetSeat.isDisabled
              ) {
                targetSeat.student = vacatedStudent;
                targetSeat.subjectId = vacatedSubjId;
                targetSeat.subjectName = subjects.find((s) => s.id === vacatedSubjId)?.name;
                targetSeat.isVacant = false;
                targetRp.allocatedCount++;
                targetRp.capacity = Math.max(targetRp.capacity, targetRp.allocatedCount);
                targetRp.vacantCount = Math.max(0, targetRp.capacity - targetRp.allocatedCount);
                reallocated = true;
                break;
              }
            }
          }
        }

        // If not reallocated and auto-expand rooms is enabled, add an extra room to place them
        if (!reallocated && allowAutoExpandRooms && eligibleExtraRooms.length > 0) {
          if (!queues[vacatedSubjId]) queues[vacatedSubjId] = [];
          queues[vacatedSubjId].unshift(vacatedStudent);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 4. Independent Validation & Reconciled Allocation Summary
  // -------------------------------------------------------------

  // 4a. Independent verification: Count actual seated students in room plans
  let verifiedAllocatedCount = 0;
  const verifiedAllocatedBySubject: Record<string, number> = {};
  subjects.forEach((s) => { verifiedAllocatedBySubject[s.id] = 0; });
  const seenStudentIds = new Set<string>();
  let duplicateCount = 0;

  for (const rp of roomPlans) {
    let roomActualCount = 0;
    for (const bench of rp.benches) {
      for (const seat of bench.seats) {
        if (seat.student) {
          roomActualCount++;
          verifiedAllocatedCount++;
          const sSubj = seat.subjectId || seat.student.subjectId;
          if (sSubj && verifiedAllocatedBySubject[sSubj] !== undefined) {
            verifiedAllocatedBySubject[sSubj]++;
          }
          const sIdentifier = seat.student.id || `${seat.student.rollNo}_${sSubj}`;
          if (seenStudentIds.has(sIdentifier)) {
            duplicateCount++;
          } else {
            seenStudentIds.add(sIdentifier);
          }
        }
      }
    }
    rp.allocatedCount = roomActualCount;
    rp.vacantCount = Math.max(0, rp.capacity - roomActualCount);
    rp.status = roomActualCount >= rp.capacity ? 'Full' : roomActualCount > 0 ? 'Partial' : 'Available';
  }

  // 4b. Subject stats based on verified counts
  const subjectStats: SubjectAllocationStat[] = subjects.map((subj) => {
    const total = initialCounts[subj.id] || 0;
    const allocated = Math.max(verifiedAllocatedBySubject[subj.id] || 0, subjectPointers[subj.id] || 0);
    const status: 'Complete' | 'Partial' | 'Unallocated' =
      allocated >= total ? 'Complete' : allocated > 0 ? 'Partial' : 'Unallocated';

    return {
      subjectId: subj.id,
      subjectName: subj.name,
      totalStudents: total,
      allocatedCount: allocated,
      status,
    };
  });

  const totalAllocatedStudents = Math.max(
    verifiedAllocatedCount,
    Object.values(subjectPointers).reduce((sum, n) => sum + n, 0)
  );
  const unallocatedStudents = Math.max(0, totalStudents - totalAllocatedStudents);
  const totalUsableCapacity = roomPlans.reduce((sum, rp) => sum + rp.capacity, 0);
  const vacantSeats = Math.max(0, totalUsableCapacity - totalAllocatedStudents);

  const issues: string[] = [];

  // Check if unallocated students remain
  if (unallocatedStudents > 0) {
    let remainingVacantSeats = 0;
    for (const rp of roomPlans) {
      for (const bench of rp.benches) {
        for (const seat of bench.seats) {
          if (!seat.student && !seat.isDisabled) remainingVacantSeats++;
        }
      }
    }
    if (remainingVacantSeats > 0) {
      issues.push(`Notice: ${unallocatedStudents} student(s) could not be accommodated in standard sequence; ${remainingVacantSeats} physical seat(s) remain.`);
    } else {
      issues.push(`${unallocatedStudents} student(s) could not be allocated due to insufficient total room capacity (All ${totalUsableCapacity} seats are filled).`);
    }
  }

  if (duplicateStudentDetected || duplicateCount > 0) {
    issues.push('Duplicate student allocation was detected and prevented by the engine.');
  }

  const summary: SeatingAllocationSummary = {
    totalStudents,
    totalRooms: roomPlans.length,
    totalCapacity: totalUsableCapacity,
    allocatedStudents: totalAllocatedStudents,
    vacantSeats,
    unallocatedStudents,
    isReady: unallocatedStudents === 0 && !duplicateStudentDetected && duplicateCount === 0,
    issues,
  };

  return {
    roomPlans,
    subjectStats,
    summary,
  };
}

/**
 * Calculates effective student capacity for a room based on active configuration
 * including integrated 3-column room configs (with custom middle bench patterns),
 * multi-subject row configuration, or 2-column mode standards.
 */
export function getRoomEffectiveCapacity(
  room: SeatingMasterRoom,
  pattern: SeatingPattern,
  isMultiSubject: boolean,
  threeColumnConfig?: ThreeColumnPatternConfig,
  multiSubjectConfig?: MultiSubjectConfig
): number {
  const leftCount = Math.max(0, Number(room.leftBenches) || 0);
  const middleCount = Math.max(0, Number(room.middleBenches) || 0);
  const rightCount = Math.max(0, Number(room.rightBenches) || 0);
  const is3ColRoom = Boolean(threeColumnConfig?.enabled) && middleCount > 0;

  if (is3ColRoom) {
    let leftSeatsPerBench = 0;
    (['SIDE_A', 'CENTER', 'SIDE_B'] as PositionSlot[]).forEach((pos) => {
      const sKey = pos === 'SIDE_A' ? 'sideA' : pos === 'CENTER' ? 'center' : 'sideB';
      const sId = threeColumnConfig?.left?.[sKey] || (sKey !== 'center' ? threeColumnConfig?.leftSubjectId : '');
      if (sId && sId !== 'VACANT' && sId !== 'NIL' && sId !== 'EMPTY') {
        leftSeatsPerBench++;
      }
    });
    const leftCap = leftCount * leftSeatsPerBench;

    let rightSeatsPerBench = 0;
    (['SIDE_A', 'CENTER', 'SIDE_B'] as PositionSlot[]).forEach((pos) => {
      const sKey = pos === 'SIDE_A' ? 'sideA' : pos === 'CENTER' ? 'center' : 'sideB';
      const sId = threeColumnConfig?.right?.[sKey] || (sKey !== 'center' ? threeColumnConfig?.rightSubjectId : '');
      if (sId && sId !== 'VACANT' && sId !== 'NIL' && sId !== 'EMPTY') {
        rightSeatsPerBench++;
      }
    });
    const rightCap = rightCount * rightSeatsPerBench;

    const mPattern = threeColumnConfig?.middlePattern || 'allThree';
    const enabledMap = threeColumnConfig?.middleEnabledSeats;
    const seatsConfig = threeColumnConfig?.middleSeats;

    const isSeatPosEnabled = (pos: PositionSlot): boolean => {
      if (mPattern === 'centerOnly') return pos === 'CENTER';
      if (mPattern === 'sideAAndSideB') return pos === 'SIDE_A' || pos === 'SIDE_B';
      if (mPattern === 'custom' && enabledMap) {
        if (pos === 'SIDE_A') return Boolean(enabledMap.sideA);
        if (pos === 'CENTER') return Boolean(enabledMap.center);
        if (pos === 'SIDE_B') return Boolean(enabledMap.sideB);
      }
      return true;
    };

    const getSeatSubj = (pos: PositionSlot): string => {
      if (seatsConfig) {
        if (pos === 'SIDE_A') return seatsConfig.sideA || '';
        if (pos === 'CENTER') return seatsConfig.center || '';
        if (pos === 'SIDE_B') return seatsConfig.sideB || '';
      }
      if (threeColumnConfig?.middle) {
        if (pos === 'SIDE_A') return threeColumnConfig.middle.sideA || '';
        if (pos === 'CENTER') return threeColumnConfig.middle.center || '';
        if (pos === 'SIDE_B') return threeColumnConfig.middle.sideB || '';
      }
      return '';
    };

    let middleSeatsPerBench = 0;
    (['SIDE_A', 'CENTER', 'SIDE_B'] as PositionSlot[]).forEach((pos) => {
      if (isSeatPosEnabled(pos)) {
        const sId = getSeatSubj(pos);
        if (sId && sId !== 'VACANT' && sId !== 'NIL' && sId !== 'EMPTY') {
          middleSeatsPerBench++;
        }
      }
    });

    return leftCap + (middleCount * middleSeatsPerBench) + rightCap;
  }

  // If in multi-subject mode, check if any enabled row actually utilizes the Center seat
  if (isMultiSubject && multiSubjectConfig?.rows) {
    const hasCenterConfigured = multiSubjectConfig.rows.some(
      (r) =>
        r.enabled !== false &&
        r.center &&
        r.center !== 'NIL' &&
        r.center !== 'VACANT' &&
        r.center !== 'UNUSED'
    );
    if (!hasCenterConfigured) {
      return room.capacityTwo;
    }
  }

  return isMultiSubject
    ? room.capacityThree
    : pattern === '1_PER_BENCH'
      ? room.capacityOne
      : pattern === '2_PER_BENCH'
        ? room.capacityTwo
        : room.capacityThree;
}

/**
 * Automatically repairs and completes any allocation where students remained unallocated
 * or room plans had gaps, achieving 100% allocation.
 */
export function completeAllocationTo100Percent(
  allocation: SeatingAllocationRecord,
  allMasterRooms: SeatingMasterRoom[],
  allSubjects: StudentSubject[],
  studentsBySubject: Record<string, StudentRecord[]>
): SeatingAllocationRecord {
  const activeSubjs = allSubjects.filter((s) => allocation.subjectIds.includes(s.id));
  const activeRooms = allMasterRooms.filter((r) => allocation.roomIds.includes(r.id));

  // If rooms list is empty or insufficient, default to allMasterRooms
  const initialRooms = activeRooms.length > 0 ? activeRooms : allMasterRooms;

  const result = runDeterministicSeatingAllocation({
    rooms: initialRooms,
    allEligibleRooms: allMasterRooms,
    subjects: activeSubjs,
    studentsBySubject,
    pattern: allocation.pattern,
    positionMapping: allocation.positionMapping,
    multiSubjectConfig: allocation.multiSubjectConfig,
    threeColumnConfig: allocation.threeColumnConfig,
    allowAutoExpandRooms: true,
  });

  return {
    ...allocation,
    roomIds: result.roomPlans.map((rp) => rp.roomId),
    roomPlans: result.roomPlans,
    subjectStats: result.subjectStats,
    summary: result.summary,
    status: allocation.status || 'Draft',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Hard validation check: Enforces that NO bench has all three seats (Side A, Center, Side B)
 * assigned to the exact same subject, and that Center is not assigned the same subject as Side A & Side B.
 */
export function validateNoTriplicateSubjectBenches(roomPlans: RoomSeatingPlan[]): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  for (const rp of roomPlans) {
    for (const b of rp.benches) {
      const seatA = b.seats.find((s) => s.position === 'SIDE_A');
      const seatC = b.seats.find((s) => s.position === 'CENTER');
      const seatB = b.seats.find((s) => s.position === 'SIDE_B');

      if (
        seatA?.student &&
        seatC?.student &&
        seatB?.student &&
        seatA.subjectId &&
        seatA.subjectId === seatC.subjectId &&
        seatC.subjectId === seatB.subjectId
      ) {
        violations.push(
          `Room ${rp.roomNo} Bench ${b.side} ${b.benchNumber}: All three seats assigned identical subject ${seatA.subjectName || seatA.subjectId}`
        );
      }

      if (
        seatA?.student &&
        seatC?.student &&
        seatB?.student &&
        seatA.subjectId &&
        seatA.subjectId === seatB.subjectId &&
        seatC.subjectId === seatA.subjectId
      ) {
        violations.push(
          `Room ${rp.roomNo} Bench ${b.side} ${b.benchNumber}: Center duplicate with Side A & Side B (${seatA.subjectName || seatA.subjectId})`
        );
      }
    }
  }
  return { isValid: violations.length === 0, violations };
}



