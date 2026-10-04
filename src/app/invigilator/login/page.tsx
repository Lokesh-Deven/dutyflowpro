"use client";

import React, { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useInvigilatorPortal } from '@/lib/invigilator-portal-context';
import { InvigilatorLoginForm } from '@/components/invigilator-portal/invigilator-login-form';
import { Loader2 } from 'lucide-react';

export default function InvigilatorLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useInvigilatorPortal();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/invigilator/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Checking invigilator session...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#0F172A] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Soft vector ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 w-full">
        <Suspense
          fallback={
            <div className="w-full max-w-[420px] mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-xs text-slate-500 font-medium">Loading Invigilator Access...</p>
            </div>
          }
        >
          <InvigilatorLoginForm />
        </Suspense>
      </div>
    </main>
  );
}
