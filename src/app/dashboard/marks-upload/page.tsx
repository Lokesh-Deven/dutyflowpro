"use client";

import React, { Suspense } from 'react';
import { AdminMarksUpload } from '@/components/dashboard/marks/admin-marks-upload';
import { Loader2 } from 'lucide-react';

export default function MarksUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading Marks Upload & Results Manager...</p>
        </div>
      }
    >
      <AdminMarksUpload />
    </Suspense>
  );
}
