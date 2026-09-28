import React, { ReactNode } from 'react';
import { StudentPortalProvider } from '@/lib/student-portal-context';

export const metadata = {
  title: 'DutyFlow - Student Access & My Examination',
  description: 'View your examination dates, timings, room allotment, and bench seating.',
};

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <StudentPortalProvider>
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
        {children}
      </div>
    </StudentPortalProvider>
  );
}
