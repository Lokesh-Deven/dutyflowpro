
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Invigilator, Examination } from '@/lib/types';

interface AllotmentContextType {
  invigilators: Invigilator[];
  setInvigilators: React.Dispatch<React.SetStateAction<Invigilator[]>>;
  examinations: Examination[];
  setExaminations: React.Dispatch<React.SetStateAction<Examination[]>>;
}

const AllotmentContext = createContext<AllotmentContextType | undefined>(undefined);

export function AllotmentProvider({ children }: { children: ReactNode }) {
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);

  return (
    <AllotmentContext.Provider value={{ invigilators, setInvigilators, examinations, setExaminations }}>
      {children}
    </AllotmentContext.Provider>
  );
}

export function useAllotment() {
  const context = useContext(AllotmentContext);
  if (context === undefined) {
    throw new Error('useAllotment must be used within an AllotmentProvider');
  }
  return context;
}
