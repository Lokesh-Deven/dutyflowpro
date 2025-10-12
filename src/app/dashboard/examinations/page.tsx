"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Examination, Invigilator } from '@/lib/types';
import { ExaminationManagement } from '@/components/dashboard/examination-management';

export default function ExaminationsPage() {
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const searchParams = useSearchParams();

  useEffect(() => {
    const invigilatorsData = searchParams.get('invigilators');
    if (invigilatorsData) {
      setInvigilators(JSON.parse(invigilatorsData));
    }
  }, [searchParams]);

  return (
    <div className="flex-1 space-y-4">
       <h1 className="text-3xl font-bold tracking-tight font-headline">New Allotment: Step 2</h1>
       <ExaminationManagement 
          examinations={examinations} 
          setExaminations={setExaminations} 
          invigilators={invigilators} 
        />
    </div>
  );
}
