
"use client";

import { ExaminationManagement } from '@/components/dashboard/examination-management';

export default function ExaminationsPage() {
  return (
    <div className="flex-1 space-y-4">
       <h1 className="text-3xl font-bold tracking-tight font-headline">New Allotment: Step 2</h1>
       <ExaminationManagement />
    </div>
  );
}
