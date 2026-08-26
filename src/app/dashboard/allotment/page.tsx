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
import { FileSpreadsheet, UserCheck, AlertCircle, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function AllotmentPage() {
  const { invigilators, examinations, activeAllotment } = useAllotment();
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
    } else {
      setAllotment({ assignments: {} });
    }
  }, [invigilators, examinations, activeAllotment, processedExaminations]);

  if (invigilators.length === 0 || examinations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] py-12">
        <Card className="w-full max-w-md text-center border-dashed border-2 shadow-none bg-muted/20 rounded-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#4F46E5] via-[#0891B2] to-[#F59E0B]" />
          <CardHeader className="pt-8 pb-4">
            <div className="mx-auto p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] ring-8 ring-indigo-50/50 dark:ring-indigo-950/20 w-fit mb-2">
              <AlertCircle className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl font-bold font-headline">Missing Data for Allotment</CardTitle>
            <CardDescription className="text-sm max-w-xs mx-auto">
              Please add examination schedules and invigilator staff before generating or viewing duty allotments.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <Button asChild className="bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold px-6 shadow-sm">
              <Link href="/dashboard/examinations">
                <PlusCircle className="mr-2 h-4 w-4" />
                Configure Examinations
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      <Tabs defaultValue="allotment-sheet" className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="bg-muted/60 p-1 rounded-xl border border-border/80 h-auto gap-1 shadow-2xs">
            <TabsTrigger 
              value="allotment-sheet" 
              className={cn(
                "px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2",
                "data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white data-[state=active]:shadow-sm",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Duty Allotment Sheet</span>
            </TabsTrigger>
            <TabsTrigger 
              value="individual-dashboard" 
              className={cn(
                "px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2",
                "data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white data-[state=active]:shadow-sm",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserCheck className="h-4 w-4" />
              <span>Individual Dashboard</span>
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
