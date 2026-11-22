import React, { Suspense } from 'react';
import { StudentResultsView } from '@/components/student-portal/results/student-results-view';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function StudentResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading Student Results Portal...</p>
        </div>
      }
    >
      <StudentResultsView />
    </Suspense>
  );
}
