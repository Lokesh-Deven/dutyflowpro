"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Examination } from '@/lib/types';
import { ExaminationManagement } from '@/components/dashboard/examination-management';
import { useToast } from '@/hooks/use-toast';

export default function ExaminationsPage() {
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const handleGenerate = () => {
    if (examinations.length > 0) {
      // In a real app, you would pass the data to the allotment page,
      // for example via state management or query params.
      // For now, we'll just navigate.
      router.push('/dashboard/allotment');
      toast({
        title: "Generating Allotment",
        description: "Moving to the duty allotment sheet.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "No Examinations",
        description: "Please add at least one examination to generate the allotment.",
      });
    }
  };

  return (
    <div className="flex-1 space-y-4">
       <h1 className="text-3xl font-bold tracking-tight font-headline">New Allotment: Step 2</h1>
       <ExaminationManagement examinations={examinations} setExaminations={setExaminations} onGenerate={handleGenerate} />
    </div>
  );
}
