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
 * Supports:
 * - Mode 1: Standard Allocation (1 or 2 Subjects) with revised sequential 2_PER_BENCH & 3_PER_BENCH Sandwich rule.
 * - Mode 2: More Than 2 Subjects (Sequential 4-Row System) with automatic immediate row advancement.
 * - Integrated 3-Column Examination Rooms across both modes with flexible Middle Bench Seating Patterns.
 * - Guarantees zero duplicate allocations and zero unallocated students when capacity is sufficient.
 */
export function runDeterministicSeatingAllocation(input: RunAllocationInput): RunAllocationResult {
  const { rooms, subjects, studentsBySubject, pattern, positionMapping, multiSubjectConfig, threeColumnConfig } = input;

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
        // the remaining subject takes Side A and Side B, leaving Center strictly vacant.
        const stA = takeStudent(soleSubj.id);
        const stB = getRemainingCount(soleSubj.id) > 0 ? takeStudent(soleSubj.id) : undefined;

        seats.push({ position: 'SIDE_A', student: stA, subjectId: stA ? soleSubj.id : undefined, subjectName: stA ? soleSubj.name : undefined });
        seats.push({ position: 'CENTER', student: undefined, isVacant: true });
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
      // If current subject just finished (had only 1 student left on its final bench):
      // Keep Side B vacant if capacity allows, ensuring pure single-subject benches;
      // or start next subject if capacity is tight to guarantee 100% student allocation.
      let stB: StudentRecord | undefined = undefined;
      let subjIdB: string | undefined = activeSubjId;
      let subjNameB: string | undefined = subjName;

      if (getRemainingCount(activeSubjId) > 0) {
        stB = takeStudent(activeSubjId);
      } else {
        // Active subject finished with Side A!
        // Advance pointer to next subject
        standardSubjectIdx++;
        const nextSubjId = rankedSubjectIds[standardSubjectIdx];

        // If remaining students exceed available 2-per-bench capacity ahead, utilize Side B immediately
        const needSideBForCapacity = getTotalRemainingStudents() > remainingBenchesAhead * 2;
        if (needSideBForCapacity && nextSubjId && getRemainingCount(nextSubjId) > 0) {
          subjIdB = nextSubjId;
          stB = takeStudent(nextSubjId);
          subjNameB = subjects.find((s) => s.id === nextSubjId)?.name;
        } else {
          // Keep Side B vacant for this transition bench to strictly preserve same subject on bench
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
    const s1Id = rankedSubjectIds[0] || pickBestSubject();
    const s2Id = rankedSubjectIds[1] || rankedSubjectIds[0];

    const isS1Finished = !s1Id || getRemainingCount(s1Id) === 0;

    if (!isS1Finished && s1Id) {
      // Phase 1: S1 is active -> Initial Sandwich Rule [ S1 | S2 | S1 ]
      const s1Name = subjects.find((s) => s.id === s1Id)?.name;
      const s2Name = s2Id ? subjects.find((s) => s.id === s2Id)?.name : undefined;

      const stA = takeStudent(s1Id);

      // Centre gets S2 (if S2 has students remaining)
      let stCenter: StudentRecord | undefined = undefined;
      let centerSubjId: string | undefined = undefined;
      let centerSubjName: string | undefined = undefined;

      if (s2Id && getRemainingCount(s2Id) > 0) {
        centerSubjId = s2Id;
        stCenter = takeStudent(s2Id);
        centerSubjName = s2Name;
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
        // S1 finished on Side A; transition to next subject on Side B, leaving Center strictly vacant
        if (s2Id && getRemainingCount(s2Id) > 0) {
          subjIdB = s2Id;
          stB = takeStudent(s2Id);
          subjNameB = s2Name;
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
      const stB = getRemainingCount(activeSubjId) > 0 ? takeStudent(activeSubjId) : undefined;

      seats.push({ position: 'SIDE_A', student: stA, subjectId: stA ? activeSubjId : undefined, subjectName: stA ? subjName : undefined });
      seats.push({ position: 'CENTER', student: undefined, isVacant: true }); // Centre is strictly vacant during subsequent allocation
      seats.push({ position: 'SIDE_B', student: stB, subjectId: stB ? activeSubjId : undefined, subjectName: stB ? subjName : undefined });

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
  // 3. TIER 2 UNIVERSAL SAFETY NET: Ensure NO student is left out
  // If capacity is sufficient, sweep any vacant seats to allocate remaining students
  // Safeguards: NEVER allocate to disabled or explicitly vacant positions
  // -------------------------------------------------------------
  if (getTotalRemainingStudents() > 0) {
    for (const rp of roomPlans) {
      if (getTotalRemainingStudents() === 0) break;
      for (const bench of rp.benches) {
        if (getTotalRemainingStudents() === 0) break;
        for (const seat of bench.seats) {
          if (getTotalRemainingStudents() === 0) break;
          // Safeguard: Never allocate into disabled or explicitly vacant seats
          if (!seat.student && !seat.isDisabled && !seat.isVacant) {
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
  // 4. Calculate Subject Stats and Summary
  // -------------------------------------------------------------
  const subjectStats: SubjectAllocationStat[] = subjects.map((subj) => {
    const total = initialCounts[subj.id] || 0;
    const allocated = subjectPointers[subj.id] || 0;
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

  const totalAllocatedStudents = Object.values(subjectPointers).reduce((sum, n) => sum + n, 0);
  const unallocatedStudents = Math.max(0, totalStudents - totalAllocatedStudents);
  const totalUsableCapacity = roomPlans.reduce((sum, rp) => sum + rp.capacity, 0);
  const vacantSeats = Math.max(0, totalUsableCapacity - totalAllocatedStudents);

  const issues: string[] = [];
  if (unallocatedStudents > 0) {
    issues.push(`${unallocatedStudents} student(s) could not be allocated due to insufficient capacity.`);
  }
  if (duplicateStudentDetected) {
    issues.push('Duplicate student allocation was detected and prevented by the engine.');
  }

  const summary: SeatingAllocationSummary = {
    totalStudents,
    totalRooms: rooms.length,
    totalCapacity: totalUsableCapacity,
    allocatedStudents: totalAllocatedStudents,
    vacantSeats,
    unallocatedStudents,
    isReady: unallocatedStudents === 0 && !duplicateStudentDetected,
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
 * including integrated 3-column room configs (with custom middle bench patterns)
 * or 2-column mode standards.
 */
export function getRoomEffectiveCapacity(
  room: SeatingMasterRoom,
  pattern: SeatingPattern,
  isMultiSubject: boolean,
  threeColumnConfig?: ThreeColumnPatternConfig
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

  return isMultiSubject
    ? room.capacityThree
    : pattern === '1_PER_BENCH'
      ? room.capacityOne
      : pattern === '2_PER_BENCH'
        ? room.capacityTwo
        : room.capacityThree;
}

