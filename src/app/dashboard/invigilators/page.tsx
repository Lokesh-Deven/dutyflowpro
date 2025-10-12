
"use client";

import { InvigilatorManagement } from '@/components/dashboard/invigilator-management';

export default function InvigilatorsPage() {
  return (
    <div className="flex-1 space-y-4">
      <h1 className="text-3xl font-bold tracking-tight font-headline">New Allotment: Step 1</h1>
      <InvigilatorManagement />
    </div>
  );
}
