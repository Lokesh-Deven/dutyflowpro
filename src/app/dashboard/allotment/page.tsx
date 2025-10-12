"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Invigilator, Examination } from '@/lib/types';
import { generateAllotment } from '@/lib/allotment';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllotmentSheet } from '@/components/dashboard/allotment-sheet';
import IndividualDashboard from '@/components/dashboard/individual-dashboard';

export default function AllotmentPage() {
  const searchParams = useSearchParams();
  const [invigilators, setInvigilators] = useState<Invigilator[]>(() => {
    const invigilatorsData = searchParams.get('invigilators');
    return invigilatorsData ? JSON.parse(invigilatorsData) : [];
  });
  const [examinations, setExaminations] = useState<Examination[]>(() => {
    const examinationsData = searchParams.get('examinations');
    if (!examinationsData) return [];
    // Need to parse dates correctly
    const parsedExams = JSON.parse(examinationsData);
    return parsedExams.map((exam: any) => ({...exam, date: new Date(exam.date)}));
  });

  const allotment = generateAllotment(invigilators, examinations);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">Duty Allotment</h1>
          <p className="text-muted-foreground">View and export the generated schedule.</p>
        </div>
      </div>
      <Tabs defaultValue="allotment-sheet">
        <TabsList>
          <TabsTrigger value="allotment-sheet">Duty Allotment Sheet</TabsTrigger>
          <TabsTrigger value="individual-dashboard">Individual Dashboard</TabsTrigger>
        </TabsList>
        <TabsContent value="allotment-sheet" className="mt-4">
          <AllotmentSheet
            invigilators={invigilators}
            examinations={examinations}
            allotmentResult={allotment}
          />
        </TabsContent>
        <TabsContent value="individual-dashboard" className="mt-4">
          <IndividualDashboard
            invigilators={invigilators}
            examinations={examinations}
            allotmentResult={allotment}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
