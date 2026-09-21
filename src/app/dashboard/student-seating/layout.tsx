"use client";

import React, { ReactNode } from 'react';
import { StudentSeatingProvider } from '@/lib/student-seating-context';

export default function StudentSeatingLayout({ children }: { children: ReactNode }) {
  return (
    <StudentSeatingProvider>
      <div className="space-y-6">
        {children}
      </div>
    </StudentSeatingProvider>
  );
}
