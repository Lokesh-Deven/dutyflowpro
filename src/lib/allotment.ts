import type { Invigilator, Examination } from './types';

export interface AllotmentResult {
  assignments: Record<string, string[]>; // invigilatorId -> examId[]
}

function hasTimeConflict(examToCheck: Examination, assignedExamIds: string[], allExaminations: Examination[]): boolean {
  const assignedExams = assignedExamIds.map(id => allExaminations.find(e => e.id === id)).filter(Boolean) as Examination[];
  for (const assignedExam of assignedExams) {
    if (new Date(assignedExam.date).toDateString() === new Date(examToCheck.date).toDateString()) {
      const startA = assignedExam.startTime;
      const endA = assignedExam.endTime;
      const startB = examToCheck.startTime;
      const endB = examToCheck.endTime;
      if (startA < endB && endA > startB) {
        return true; // Overlap found
      }
    }
  }
  return false;
}

export function generateAllotment(invigilators: Invigilator[], examinations: Examination[]): AllotmentResult {
  const assignments: Record<string, string[]> = {};
  invigilators.forEach(inv => { assignments[inv.id] = []; });

  const sortedExams = [...examinations].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  const dutyPool: string[] = [];
  sortedExams.forEach(exam => {
    const totalDutiesForExam = (exam.rooms || 0) + (exam.relievers || 0);
    for (let i = 0; i < totalDutiesForExam; i++) {
      dutyPool.push(exam.id);
    }
  });

  // Assuming invigilators are added senior-to-junior, reverse to prioritize juniors.
  const invigilatorPool = [...invigilators].reverse(); 

  dutyPool.forEach(examId => {
    const exam = examinations.find(e => e.id === examId)!;
    
    // Find a suitable invigilator for the current duty
    for (let i = 0; i < invigilatorPool.length; i++) {
        const invigilator = invigilatorPool[i];

        // 1. Check availability
        if (!invigilator.isAvailableAllDays && !invigilator.availableExamIds.includes(exam.id)) {
            continue; // Not available for this exam
        }

        // 2. Check for time conflict
        if (hasTimeConflict(exam, assignments[invigilator.id], examinations)) {
            continue;
        }

        // Assign duty
        assignments[invigilator.id].push(exam.id);

        // Rotate invigilator to the end of the pool for load balancing
        invigilatorPool.splice(i, 1);
        invigilatorPool.push(invigilator);
        
        // Break from inner loop and move to the next duty
        break; 
    }
  });

  return { assignments };
}
