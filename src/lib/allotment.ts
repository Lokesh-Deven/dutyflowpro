
import type { Invigilator, Examination } from './types';
import { format } from 'date-fns';

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
  const dutyPool: string[] = [];
  examinations.forEach(exam => {
    const totalDutiesForExam = exam.rooms + exam.relievers;
    for (let i = 0; i < totalDutiesForExam; i++) {
      dutyPool.push(exam.id);
    }
  });

  const partTimeInvigilators = invigilators.filter(inv => inv.isPartTime);
  const fullTimeInvigilators = invigilators.filter(inv => !inv.isPartTime);

  // 1. Assign duties to part-time invigilators first, respecting their constraints
  partTimeInvigilators.forEach(inv => {
    const invigilatorDayIndexes = inv.availableDays?.map(day => daysOfWeek.indexOf(day));

    // Find exams that match the invigilator's available days
    const availableExams = examinations.filter(exam => {
      const examDayIndex = exam.date.getDay();
      return invigilatorDayIndexes?.includes(examDayIndex);
    });

    let dutiesAssignedToPartTimer = 0;
    for (const exam of availableExams) {
      if (dutiesAssignedToPartTimer >= 2) break;

      const dutyIndexInPool = dutyPool.indexOf(exam.id);
      if (dutyIndexInPool !== -1) {
        assignments[inv.id].push(exam.id);
        dutyPool.splice(dutyIndexInPool, 1);
        dutiesAssignedToPartTimer++;
      }
    }
  });

  // 2. Distribute remaining duties among full-time invigilators
  if (fullTimeInvigilators.length > 0) {
    const remainingDuties = dutyPool.length;
    const baseDutiesPerInvigilator = Math.floor(remainingDuties / fullTimeInvigilators.length);
    let excessDuties = remainingDuties % fullTimeInvigilators.length;

    // 2a. Assign base duties evenly using round-robin
    for (let i = 0; i < baseDutiesPerInvigilator; i++) {
      for (const inv of fullTimeInvigilators) {
        const duty = dutyPool.shift();
        if (duty) {
          assignments[inv.id].push(duty);
        }
      }
    }

    // 2b. Assign excess duties to the most junior invigilators
    // The invigilator list is senior-first, so we iterate from the end of the full-time list.
    if (excessDuties > 0) {
      const juniorInvigilators = [...fullTimeInvigilators].reverse(); // Junior-most first
      for (let i = 0; i < excessDuties; i++) {
        const invigilator = juniorInvigilators[i];
        const duty = dutyPool.shift();
        if (duty) {
          assignments[invigilator.id].push(duty);
        }
      }
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
            assignments[inv.id].push(duty);
        }
        i++;
     }
  }


  return { assignments };
}
