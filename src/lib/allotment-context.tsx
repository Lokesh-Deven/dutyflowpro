
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Invigilator, Examination, SavedAllotment, AllotmentResult } from '@/lib/types';
import { generateAllotment } from './allotment';

interface AllotmentContextType {
  invigilators: Invigilator[];
  setInvigilators: React.Dispatch<React.SetStateAction<Invigilator[]>>;
  examinations: Examination[];
  setExaminations: React.Dispatch<React.SetStateAction<Examination[]>>;
  savedAllotments: SavedAllotment[];
  saveCurrentAllotment: (name: string, assignments: AllotmentResult['assignments']) => SavedAllotment;
  activeAllotment: SavedAllotment | null;
  setActiveAllotment: React.Dispatch<React.SetStateAction<SavedAllotment | null>>;
  updateSavedAllotment: (id: string, updatedAllotment: Partial<SavedAllotment>) => void;
  deleteSavedAllotment: (id: string) => void;
  clearCurrentAllotment: () => void;
}

const AllotmentContext = createContext<AllotmentContextType | undefined>(undefined);

export function AllotmentProvider({ children }: { children: ReactNode }) {
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [savedAllotments, setSavedAllotments] = useState<SavedAllotment[]>([]);
  const [activeAllotment, setActiveAllotment] = useState<SavedAllotment | null>(null);

  useEffect(() => {
    if (activeAllotment) {
      setInvigilators(activeAllotment.invigilators);
      setExaminations(activeAllotment.examinations.map(e => ({...e, date: new Date(e.date)})));
    } else {
      setInvigilators([]);
      setExaminations([]);
    }
  }, [activeAllotment]);

  const saveCurrentAllotment = (name: string, assignments: AllotmentResult['assignments']) => {
    if (activeAllotment && savedAllotments.some(sa => sa.id === activeAllotment.id)) {
      // Update existing
      const updated: SavedAllotment = {
        ...activeAllotment,
        name,
        invigilators,
        examinations,
        assignments,
      };
      setSavedAllotments(prev => prev.map(sa => sa.id === updated.id ? updated : sa));
      setActiveAllotment(updated);
      return updated;
    } else {
      // Create new
      const newSavedAllotment: SavedAllotment = {
        id: `allotment-${Date.now()}`,
        name,
        invigilators,
        examinations,
        assignments,
        createdAt: new Date(),
        status: 'Draft',
      };
      setSavedAllotments(prev => [...prev, newSavedAllotment]);
      setActiveAllotment(newSavedAllotment);
      return newSavedAllotment;
    }
  };
  
  const updateSavedAllotment = (id: string, updatedAllotment: Partial<SavedAllotment>) => {
    setSavedAllotments(prev => prev.map(sa => sa.id === id ? {...sa, ...updatedAllotment} : sa));
  };

  const deleteSavedAllotment = (id: string) => {
    setSavedAllotments(prev => prev.filter(sa => sa.id !== id));
    if(activeAllotment?.id === id) {
      setActiveAllotment(null);
    }
  };
  
  const clearCurrentAllotment = () => {
    setActiveAllotment(null);
    setInvigilators([]);
    setExaminations([]);
  };

  return (
    <AllotmentContext.Provider value={{
      invigilators, setInvigilators,
      examinations, setExaminations,
      savedAllotments, saveCurrentAllotment,
      activeAllotment, setActiveAllotment,
      updateSavedAllotment, deleteSavedAllotment,
      clearCurrentAllotment
    }}>
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
