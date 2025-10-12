
"use client";

import { useAllotment } from '@/lib/allotment-context';
import { generateAllotment } from '@/lib/allotment';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllotmentSheet } from '@/components/dashboard/allotment-sheet';
import IndividualDashboard from '@/components/dashboard/individual-dashboard';

export default function AllotmentPage() {
  const { invigilators, examinations } = useAllotment();

  // Ensure examinations have Date objects
  const processedExaminations = examinations.map(exam => ({
    ...exam,
    date: new Date(exam.date),
  }));

  const allotment = generateAllotment(invigilators, processedExaminations);

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
            examinations={processedExaminations}
            allotmentResult={allotment}
          />
        </TabsContent>
        <TabsContent value="individual-dashboard" className="mt-4">
          <IndividualDashboard
            invigilators={invigilators}
            examinations={processedExaminations}
            allotmentResult={allotment}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
