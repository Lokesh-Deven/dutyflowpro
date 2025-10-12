import type { Invigilator, Examination } from './types';

export interface AllotmentResult {
  assignments: Record<string, string[]>; // invigilatorId -> examId[]
}

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function generateAllotment(invigilators: Invigilator[], examinations: Examination[]): AllotmentResult {
  const assignments: Record<string, string[]> = {};
  invigilators.forEach(inv => {
    assignments[inv.id] = [];
  });

  // Create a pool of all available duties from the examinations
  // Each duty is unique, even for the same exam
  const dutyPool: { dutyId: string, examId: string, exam: Examination }[] = [];
  examinations.forEach(exam => {
    const totalDutiesForExam = exam.rooms + exam.relievers;
    for (let i = 0; i < totalDutiesForExam; i++) {
      dutyPool.push({ dutyId: `${exam.id}-duty-${i}`, examId: exam.id, exam });
    }
  });

  const partTimeInvigilators = invigilators.filter(inv => inv.isPartTime);
  const fullTimeInvigilators = invigilators.filter(inv => !inv.isPartTime);

  // 1. Assign duties to part-time invigilators first, respecting their constraints
  partTimeInvigilators.forEach(inv => {
    const invigilatorDayIndexes = inv.availableDays?.map(day => daysOfWeek.indexOf(day));

    // Find duties on days the part-timer is available
    const availableDuties = dutyPool.filter(duty => {
      const examDayIndex = duty.exam.date.getDay();
      return invigilatorDayIndexes?.includes(examDayIndex);
    });

    let dutiesAssignedToPartTimer = 0;
    for (const duty of availableDuties) {
      if (dutiesAssignedToPartTimer >= 2) break;

      const dutyIndexInPool = dutyPool.findIndex(p => p.dutyId === duty.dutyId);
      if (dutyIndexInPool !== -1) {
        // Check if already assigned a duty for this same exam
        if (!assignments[inv.id].includes(duty.examId)) {
          assignments[inv.id].push(duty.examId);
          dutyPool.splice(dutyIndexInPool, 1);
          dutiesAssignedToPartTimer++;
        }
      }
    }
  });

  // 2. Distribute remaining duties among full-time invigilators
  if (fullTimeInvigilators.length > 0) {
    let dutyIndex = 0;
    while(dutyPool.length > 0) {
      // Round-robin assignment to junior invigilators first
      const invigilatorIndex = (dutyIndex % fullTimeInvigilators.length);
      const invigilator = fullTimeInvigilators[fullTimeInvigilators.length - 1 - invigilatorIndex];
      
      const dutyToAssign = dutyPool.shift();

      if (dutyToAssign) {
         // Check if this invigilator already has a duty for this exam
         // This can happen if an exam needs multiple invigilators.
         // A simple check prevents double assignment for the same slot, but we want multiple invigilators for multiple rooms.
         // The current logic assigns one duty *per exam* to an invigilator.
         // If an exam has 5 rooms, 5 different invigilators should be assigned.
         
         // A better approach is to check if invigilator is already assigned *any* duty at that time.
         // For now, simple distribution.
         assignments[invigilator.id].push(dutyToAssign.examId);
      }
      dutyIndex++;
    }
  }
  
  // If any duties are still unassigned (e.g., only part-timers available but constraints met),
  // distribute them to the most junior invigilators overall.
  if (dutyPool.length > 0 && invigilators.length > 0) {
     const juniorInvigilators = [...invigilators.filter(inv => !inv.isPartTime)].reverse();
     let i = 0;
     while(dutyPool.length > 0) {
        const inv = juniorInvigilators[i % juniorInvigilators.length];
        const duty = dutyPool.shift();
        if(duty) {
            assignments[inv.id].push(duty.examId);
        }
        i++;
     }
  }


  return { assignments };
}
