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

  // Create a pool of duties for each exam
  const dutyPool: string[] = [];
  examinations.forEach(exam => {
    const totalDuties = exam.rooms + exam.relievers;
    for (let i = 0; i < totalDuties; i++) {
      dutyPool.push(exam.id);
    }
  });

  // Separate part-time and full-time invigilators
  const partTimeInvigilators = invigilators.filter(inv => inv.isPartTime);
  const fullTimeInvigilators = invigilators.filter(inv => !inv.isPartTime);

  // Assign duties to part-time invigilators first
  partTimeInvigilators.forEach(inv => {
    const invigilatorDayNames = inv.availableDays?.map(dayIndex => daysOfWeek[parseInt(dayIndex, 10)]) || [];

    examinations.forEach(exam => {
        const examDayName = format(exam.date, 'EEEE');
        
        // Check if invigilator is available and has less than 2 duties
        if (
            (inv.availableDays?.includes(exam.date.getDay().toString()) || invigilatorDayNames.includes(examDayName)) &&
            assignments[inv.id].length < 2
        ) {
            const dutyIndex = dutyPool.indexOf(exam.id);
            if (dutyIndex !== -1) {
                assignments[inv.id].push(exam.id);
                dutyPool.splice(dutyIndex, 1);
            }
        }
    });
  });

  // Assign duties to full-time invigilators
  if (fullTimeInvigilators.length > 0) {
    let currentInvigilatorIndex = 0;
    while(dutyPool.length > 0) {
      const invigilator = fullTimeInvigilators[currentInvigilatorIndex % fullTimeInvigilators.length];
      const duty = dutyPool.shift();
      if(duty) {
        assignments[invigilator.id].push(duty);
      }
      currentInvigilatorIndex++;
    }
  }

  // Final check for unassigned duties and re-distribution if any (simple round-robin for remaining)
  if (dutyPool.length > 0 && invigilators.length > 0) {
    let allInvigilatorIndex = 0;
     while(dutyPool.length > 0) {
      const invigilator = invigilators[allInvigilatorIndex % invigilators.length];
      // simplified check, ignores part-time constraints for remaining duties
      const duty = dutyPool.shift();
       if(duty) {
        assignments[invigilator.id].push(duty);
      }
      allInvigilatorIndex++;
    }
  }


  return { assignments };
}
