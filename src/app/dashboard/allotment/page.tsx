
"use client";

import { useAllotment } from '@/lib/allotment-context';
import { generateAllotment } from '@/lib/allotment';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllotmentSheet } from '@/components/dashboard/allotment-sheet';
import IndividualDashboard from '@/components/dashboard/individual-dashboard';
import { useEffect, useState, useMemo } from 'react';
import type { AllotmentResult } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AllotmentPage() {
  const { invigilators, examinations, activeAllotment, saveCurrentAllotment } = useAllotment();
  const [allotment, setAllotment] = useState<AllotmentResult>({ assignments: {} });
  
  const processedExaminations = useMemo(() => examinations.map(exam => ({
    ...exam,
    date: new Date(exam.date),
  })), [examinations]);

  useEffect(() => {
    if (activeAllotment && Object.keys(activeAllotment.assignments).length > 0) {
      setAllotment({ assignments: activeAllotment.assignments });
    } else if (invigilators.length > 0 && examinations.length > 0) {
      const generated = generateAllotment(invigilators, processedExaminations);
      setAllotment(generated);
      // If it's a new allotment, we might want to save its initial generated state
      if (!activeAllotment) {
        saveCurrentAllotment("New Allotment Draft", generated.assignments);
      }
    } else {
        setAllotment({ assignments: {} });
    }
  }, [invigilators, examinations, activeAllotment]);

  if (invigilators.length === 0 || examinations.length === 0) {
    return (
        <Card className="m-auto mt-10 max-w-lg text-center">
            <CardHeader>
                <CardTitle>Missing Data</CardTitle>
                <CardDescription>You need to add invigilators and examinations before an allotment can be shown.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/dashboard/invigilators">Start New Allotment</Link>
                </Button>
            </CardContent>
        </Card>
    )
  }


  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">{activeAllotment?.name || 'Duty Allotment'}</h1>
          <p className="text-muted-foreground">View, edit, and export the generated schedule.</p>
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
            onAllotmentChange={setAllotment}
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
