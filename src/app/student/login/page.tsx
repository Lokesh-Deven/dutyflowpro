import React, { Suspense } from 'react';
import { StudentLoginForm } from '@/components/student-portal/student-login-form';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export default function StudentLoginPage() {
  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 group-hover:border-indigo-400 transition-colors">
            <Image
              src="/Dutyflow Logo.png"
              alt="DutyFlow Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="font-headline font-black text-lg tracking-tight text-slate-900 group-hover:text-indigo-700 transition-colors">
            Duty<span className="text-indigo-600">Flow</span>
          </span>
        </Link>

        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Student Portal
        </span>
      </header>

      {/* Main Content Form */}
      <main className="flex-1 flex items-center justify-center my-auto py-6">
        <Suspense
          fallback={
            <div className="w-full max-w-[420px] mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-xs text-slate-500 font-medium">Loading Student Access...</p>
            </div>
          }
        >
          <StudentLoginForm />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto text-center pt-4 text-xs text-slate-400 border-t border-slate-200/60">
        &copy; {new Date().getFullYear()} DutyFlow. All rights reserved.
      </footer>
    </div>
  );
}
