"use client";

import { useState, useEffect } from 'react';
import type { Invigilator, Examination } from '@/lib/types';
import { AllotmentSheet } from '@/components/dashboard/allotment-sheet';

// In a real app, you would fetch this data or get it from a state management solution
const mockInvigilators: Invigilator[] = [
    { id: 'inv-1', name: 'Dr. Alice', designation: 'Professor', email: 'alice@example.com', availableDays: [], isPartTime: false },
    { id: 'inv-2', name: 'Prof. Bob', designation: 'Asst. Professor', email: 'bob@example.com', availableDays: [], isPartTime: false },
];

const mockExaminations: Examination[] = [
    { id: 'exam-1', college: 'SIPUC', examName: 'Mid-Term', date: new Date('2024-08-10'), subject: 'Physics', startTime: '09:00', endTime: '12:00', rooms: 2, relievers: 1 },
    { id: 'exam-2', college: 'SIPUC', examName: 'Mid-Term', date: new Date('2024-08-11'), subject: 'Chemistry', startTime: '14:00', endTime: '17:00', rooms: 3, relievers: 1 },
];


export default function AllotmentPage() {
  // For this prototype, we'll use mock data on the allotment page.
  // In a real app, this data would be passed from the previous steps.
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);

  useEffect(() => {
    // Simulate fetching or receiving data
    setInvigilators(mockInvigilators);
    setExaminations(mockExaminations);
  }, []);

  return (
    <div className="flex-1 space-y-4">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Duty Allotment</h1>
        <AllotmentSheet invigilators={invigilators} examinations={examinations} />
    </div>
  );
}
