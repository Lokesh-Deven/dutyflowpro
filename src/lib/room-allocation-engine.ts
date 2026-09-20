import {
  Examination,
  Invigilator,
  SavedAllotment,
  SessionRoomAllocation,
  InvigilatorRoomDuty,
  RelieverRoomDuty,
} from './types';

export interface RoleAllocationStats {
  invigilatorId: string;
  name: string;
  designation?: string;
  totalDuties: number;
  relieverDuties: number;
  invigilatorDuties: number;
  seniorityIndex: number;
  assignedRoomsHistory: string[];
}

export interface AllocationEngineResult {
  success: boolean;
  allocation?: SessionRoomAllocation;
  errors?: string[];
  warnings?: string[];
}

/**
 * Compute historical duty stats and assigned rooms for all staff across all other sessions in the allotment.
 */
export function computeStaffHistory(
  allotment: SavedAllotment,
  excludeExamId?: string
): Map<string, RoleAllocationStats> {
  const statsMap = new Map<string, RoleAllocationStats>();

  // Initialize with all staff in the allotment
  allotment.invigilators.forEach((inv, index) => {
    statsMap.set(inv.id, {
      invigilatorId: inv.id,
      name: inv.name,
      designation: inv.designation,
      totalDuties: allotment.assignments[inv.id]?.length || 0,
      relieverDuties: 0,
      invigilatorDuties: 0,
      seniorityIndex: index,
      assignedRoomsHistory: [],
    });
  });

  const roomAllocations = allotment.roomAllocations || {};

  // Traverse all sessions (excluding the specified one)
  allotment.examinations.forEach((exam) => {
    if (excludeExamId && exam.id === excludeExamId) return;

    const sessionAlloc = roomAllocations[exam.id];
    if (!sessionAlloc || sessionAlloc.status === 'Pending') return;

    // Count Invigilator duties & track rooms
    sessionAlloc.invigilatorDuties.forEach((duty) => {
      const staffStat = statsMap.get(duty.invigilatorId);
      if (staffStat) {
        staffStat.invigilatorDuties += 1;
        if (duty.room) {
          staffStat.assignedRoomsHistory.push(duty.room);
        }
      }
    });

    // Count Reliever duties
    sessionAlloc.relieverDuties.forEach((duty) => {
      const staffStat = statsMap.get(duty.relieverId);
      if (staffStat) {
        staffStat.relieverDuties += 1;
      }
    });
  });

  return statsMap;
}

/**
 * Distribute an array of rooms among relievers as evenly as possible.
 * The difference between any two relievers' room count will not exceed 1.
 */
export function distributeRoomsToRelievers(
  rooms: string[],
  relievers: { id: string; name: string; designation?: string }[]
): RelieverRoomDuty[] {
  if (relievers.length === 0) return [];
  if (rooms.length === 0) {
    return relievers.map(r => ({
      relieverId: r.id,
      relieverName: r.name,
      designation: r.designation,
      rooms: [],
    }));
  }

  const numRelievers = relievers.length;
  const baseCount = Math.floor(rooms.length / numRelievers);
  const remainder = rooms.length % numRelievers;

  const result: RelieverRoomDuty[] = [];
  let roomIndex = 0;

  for (let i = 0; i < numRelievers; i++) {
    const countForThisReliever = baseCount + (i < remainder ? 1 : 0);
    const assignedRooms = rooms.slice(roomIndex, roomIndex + countForThisReliever);
    roomIndex += countForThisReliever;

    result.push({
      relieverId: relievers[i].id,
      relieverName: relievers[i].name,
      designation: relievers[i].designation,
      rooms: assignedRooms,
    });
  }

  return result;
}

/**
 * Assign selected rooms to regular invigilators while strictly minimizing room repetition.
 * Rule: An invigilator should not receive the same room more than once during the examination schedule.
 * If unavoidable, select the least recently assigned room and document the repetition.
 */
export function assignRoomsToInvigilators(
  rooms: string[],
  invigilators: { id: string; name: string; designation?: string }[],
  historyMap: Map<string, RoleAllocationStats>
): { duties: InvigilatorRoomDuty[]; warnings: string[] } {
  const warnings: string[] = [];
  const duties: InvigilatorRoomDuty[] = [];
  const availableRooms = [...rooms];

  // Map each invigilator to previously assigned rooms
  const invigilatorHistory = invigilators.map(inv => {
    const stats = historyMap.get(inv.id);
    const pastRooms = stats?.assignedRoomsHistory || [];
    return {
      inv,
      pastRooms,
      pastRoomsSet: new Set(pastRooms),
    };
  });

  // Sort invigilators by the number of available rooms they haven't had yet (most constrained first)
  invigilatorHistory.sort((a, b) => {
    const freeA = availableRooms.filter(r => !a.pastRoomsSet.has(r)).length;
    const freeB = availableRooms.filter(r => !b.pastRoomsSet.has(r)).length;
    return freeA - freeB;
  });

  for (const item of invigilatorHistory) {
    const { inv, pastRooms, pastRoomsSet } = item;

    // 1. Try to find a room that the invigilator has NEVER had
    const unvisitedRoomIndex = availableRooms.findIndex(r => !pastRoomsSet.has(r));

    if (unvisitedRoomIndex !== -1) {
      const chosenRoom = availableRooms.splice(unvisitedRoomIndex, 1)[0];
      duties.push({
        invigilatorId: inv.id,
        invigilatorName: inv.name,
        designation: inv.designation,
        room: chosenRoom,
      });
    } else {
      // 2. Room repetition is unavoidable for this invigilator
      // Choose the least recently assigned room among available rooms
      let bestIndex = 0;
      let earliestOccurrence = Infinity;

      availableRooms.forEach((r, idx) => {
        const lastIdx = pastRooms.lastIndexOf(r);
        if (lastIdx < earliestOccurrence) {
          earliestOccurrence = lastIdx;
          bestIndex = idx;
        }
      });

      const chosenRoom = availableRooms.splice(bestIndex, 1)[0];
      warnings.push(`⚠ Room repetition unavoidable for ${inv.name} because all eligible rooms have previously been assigned.`);

      duties.push({
        invigilatorId: inv.id,
        invigilatorName: inv.name,
        designation: inv.designation,
        room: chosenRoom,
      });
    }
  }

  // Sort duties naturally by Room number/name (alphanumeric sort)
  duties.sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true, sensitivity: 'base' }));

  return { duties, warnings };
}

/**
 * Main Allocation Function: Generates complete role division, invigilator rooms, and reliever distributions.
 */
export function generateSessionRoomAllocation(
  examination: Examination,
  allotment: SavedAllotment,
  selectedRooms: string[]
): AllocationEngineResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredInvigilators = examination.rooms || 0;
  const requiredRelievers = examination.relievers || 0;
  const totalRequired = requiredInvigilators + requiredRelievers;

  // 1. Room Count Validation
  if (selectedRooms.length !== requiredInvigilators) {
    if (selectedRooms.length < requiredInvigilators) {
      errors.push(
        `⚠ ${requiredInvigilators} invigilators are required, but only ${selectedRooms.length} room${
          selectedRooms.length === 1 ? '' : 's'
        } have been selected. Please select ${requiredInvigilators} rooms before continuing.`
      );
    } else {
      errors.push(
        `⚠ ${selectedRooms.length} rooms have been selected, but only ${requiredInvigilators} invigilators are required. Please resolve mismatch.`
      );
    }
    return { success: false, errors };
  }

  // 2. Identify assigned staff for this session from Master Allotment
  const assignedStaff = allotment.invigilators.filter((inv) =>
    allotment.assignments[inv.id]?.includes(examination.id)
  );

  // 3. Staff Shortage Validation (Rule 12)
  if (assignedStaff.length < totalRequired) {
    errors.push(
      `⚠ Insufficient staff available. Required: ${totalRequired} (${requiredInvigilators} Invigilators + ${requiredRelievers} Relievers), Available: ${assignedStaff.length}, Shortage: ${
        totalRequired - assignedStaff.length
      }. Please assign sufficient staff in Master Allotment.`
    );
    return { success: false, errors };
  }

  // 4. Compute historical staff statistics
  const historyMap = computeStaffHistory(allotment, examination.id);

  // 5. Fair Reliever Selection (Rule 9 & 10)
  // Rank staff for Reliever role:
  // Priority 1: Never previously assigned Reliever duty (relieverDuties === 0)
  // Priority 2: Lowest number of previous Reliever duties
  // Priority 3: Overall duty distribution
  // Priority 4: Seniority order tie-breaker
  const staffCandidates = assignedStaff.map((inv) => {
    const stats = historyMap.get(inv.id);
    return {
      inv,
      relieverDuties: stats?.relieverDuties || 0,
      totalDuties: stats?.totalDuties || 0,
      seniorityIndex: stats?.seniorityIndex || 0,
    };
  });

  staffCandidates.sort((a, b) => {
    // Priority 1 & 2: lowest previous reliever duties
    if (a.relieverDuties !== b.relieverDuties) {
      return a.relieverDuties - b.relieverDuties;
    }
    // Priority 3: total duty count
    if (a.totalDuties !== b.totalDuties) {
      return b.totalDuties - a.totalDuties;
    }
    // Priority 4: Seniority order (senior-to-junior or original order)
    return a.seniorityIndex - b.seniorityIndex;
  });

  // Pick top N_rel as Relievers
  const selectedRelievers = staffCandidates.slice(0, requiredRelievers).map((c) => c.inv);

  // The remaining candidates are regular Invigilators
  const selectedInvigilators = staffCandidates.slice(requiredRelievers, totalRequired).map((c) => c.inv);

  // 6. Invigilator Room Allocation with Non-Repetition Rule (Rule 13, 14, 15)
  const { duties: invigilatorDuties, warnings: roomWarnings } = assignRoomsToInvigilators(
    selectedRooms,
    selectedInvigilators,
    historyMap
  );
  warnings.push(...roomWarnings);

  // 7. Reliever Room Distribution (Rule 16)
  // Evenly distribute the assigned examination rooms among selected relievers
  const relieverDuties = distributeRoomsToRelievers(
    selectedRooms,
    selectedRelievers.map((r) => ({ id: r.id, name: r.name, designation: r.designation }))
  );

  const allocation: SessionRoomAllocation = {
    examId: examination.id,
    selectedRooms,
    invigilatorDuties,
    relieverDuties,
    status: 'Generated',
    warnings: warnings.length > 0 ? warnings : undefined,
    generatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    allocation,
    warnings,
  };
}
