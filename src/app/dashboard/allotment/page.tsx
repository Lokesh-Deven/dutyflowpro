
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
import { cn } from '@/lib/utils';

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
      // Auto-save removed as per user request for single copy management
    } else {
        setAllotment({ assignments: {} });
    }
  }, [invigilators, examinations, activeAllotment, processedExaminations]);

  if (invigilators.length === 0 || examinations.length === 0) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-lg text-center shadow-xl border-t-4 border-t-primary">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline font-bold">Missing Data</CardTitle>
                    <CardDescription>You need to add examinations and invigilators before an allotment can be shown.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold px-8">
                        <Link href="/dashboard/examinations">Start New Allotment</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }


  return (
    <div className="flex-1 space-y-8">
      <Tabs defaultValue="allotment-sheet" className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="bg-slate-100/80 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 h-auto gap-2">
            <TabsTrigger 
              value="allotment-sheet" 
              className={cn(
                "px-8 py-3 rounded-lg font-bold transition-all duration-300",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg",
                "hover:bg-white/50 dark:hover:bg-slate-700/50"
              )}
            >
              Duty Allotment Sheet
            </TabsTrigger>
            <TabsTrigger 
              value="individual-dashboard" 
              className={cn(
                "px-8 py-3 rounded-lg font-bold transition-all duration-300",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg",
                "hover:bg-white/50 dark:hover:bg-slate-700/50"
              )}
            >
              Individual Dashboard
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="allotment-sheet" className="mt-0 ring-0 focus-visible:ring-0">
          <AllotmentSheet
            invigilators={invigilators}
            examinations={processedExaminations}
            allotmentResult={allotment}
            onAllotmentChange={setAllotment}
          />
        </TabsContent>
        <TabsContent value="individual-dashboard" className="mt-0 ring-0 focus-visible:ring-0">
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
