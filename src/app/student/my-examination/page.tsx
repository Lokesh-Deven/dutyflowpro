'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentPortal } from '@/lib/student-portal-context';
import { MyExaminationView } from '@/components/student-portal/my-examination-view';
import { Loader2 } from 'lucide-react';

export default function MyExaminationPage() {
  const router = useRouter();
  const { session, isAuthenticated, isLoading } = useStudentPortal();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/student/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-400 tracking-wide">
          Verifying student credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return null; // Will redirect via useEffect
  }

  return <MyExaminationView />;
}
