
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Invigilator, Examination, SavedAllotment, AllotmentResult } from '@/lib/types';

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
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage on client mount
  useEffect(() => {
    try {
      const storedSaved = localStorage.getItem('dutyflow_saved_allotments');
      if (storedSaved) {
        const parsed = JSON.parse(storedSaved);
        if (Array.isArray(parsed)) {
          setSavedAllotments(parsed.map((a: any) => ({
            ...a,
            createdAt: new Date(a.createdAt),
            examinations: (a.examinations || []).map((e: any) => ({ ...e, date: new Date(e.date) })),
          })));
        }
      }

      const storedExams = localStorage.getItem('dutyflow_examinations');
      if (storedExams) {
        const parsed = JSON.parse(storedExams);
        if (Array.isArray(parsed)) {
          setExaminations(parsed.map((e: any) => ({ ...e, date: new Date(e.date) })));
        }
      }

      const storedInvs = localStorage.getItem('dutyflow_invigilators');
      if (storedInvs) {
        const parsed = JSON.parse(storedInvs);
        if (Array.isArray(parsed)) {
          setInvigilators(parsed);
        }
      }

      const storedActive = localStorage.getItem('dutyflow_active_allotment');
      if (storedActive) {
        const parsed = JSON.parse(storedActive);
        if (parsed && parsed.id) {
          setActiveAllotment({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            examinations: (parsed.examinations || []).map((e: any) => ({ ...e, date: new Date(e.date) })),
          });
        }
      }
    } catch (err) {
      console.error("Error loading stored allotment data:", err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('dutyflow_saved_allotments', JSON.stringify(savedAllotments));
    } catch (e) {
      console.error("Failed to save allotments to localStorage:", e);
    }
  }, [savedAllotments, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('dutyflow_examinations', JSON.stringify(examinations));
    } catch (e) {
      console.error("Failed to save examinations to localStorage:", e);
    }
  }, [examinations, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('dutyflow_invigilators', JSON.stringify(invigilators));
    } catch (e) {
      console.error("Failed to save invigilators to localStorage:", e);
    }
  }, [invigilators, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (activeAllotment) {
        localStorage.setItem('dutyflow_active_allotment', JSON.stringify(activeAllotment));
      } else {
        localStorage.removeItem('dutyflow_active_allotment');
      }
    } catch (e) {
      console.error("Failed to save active allotment to localStorage:", e);
    }
  }, [activeAllotment, isLoaded]);

  // When activeAllotment changes to a specific saved allotment, sync its exams & invigilators
  useEffect(() => {
    if (activeAllotment) {
      setInvigilators(activeAllotment.invigilators);
      setExaminations(activeAllotment.examinations.map(e => ({ ...e, date: new Date(e.date) })));
    }
  }, [activeAllotment]);

  const saveCurrentAllotment = useCallback((name: string, assignments: AllotmentResult['assignments']) => {
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
      setSavedAllotments(prev => [newSavedAllotment, ...prev]);
      setActiveAllotment(newSavedAllotment);
      return newSavedAllotment;
    }
  }, [activeAllotment, savedAllotments, invigilators, examinations]);
  
  const updateSavedAllotment = (id: string, updatedAllotment: Partial<SavedAllotment>) => {
    setSavedAllotments(prev => prev.map(sa => sa.id === id ? { ...sa, ...updatedAllotment } : sa));
    if (activeAllotment?.id === id) {
      setActiveAllotment(prev => prev ? { ...prev, ...updatedAllotment } : null);
    }
  };

  const deleteSavedAllotment = (id: string) => {
    setSavedAllotments(prev => prev.filter(sa => sa.id !== id));
    if (activeAllotment?.id === id) {
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
