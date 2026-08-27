"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { Invigilator, Examination, SavedAllotment, AllotmentResult } from '@/lib/types';
import { useAuth } from './auth-context';
import {
  syncAllotmentToDatabase,
  fetchUserAllotmentsFromDatabase,
  deleteUserAllotmentFromDatabase
} from './storage-service';

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
  isCloudSynced: boolean;
}

const AllotmentContext = createContext<AllotmentContextType | undefined>(undefined);

export function AllotmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [savedAllotments, setSavedAllotments] = useState<SavedAllotment[]>([]);
  const [activeAllotment, setActiveAllotment] = useState<SavedAllotment | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  const prevUserIdRef = useRef<string | undefined>(undefined);

  // Helper to get user-scoped localStorage key
  const getStorageKey = useCallback((baseKey: string) => {
    const scope = user?.id ? user.id : 'guest';
    return `dutyflow_${scope}_${baseKey}`;
  }, [user?.id]);

  // Clean up legacy un-scoped localStorage keys on client mount to prevent cross-account leak
  useEffect(() => {
    try {
      localStorage.removeItem('dutyflow_saved_allotments');
      localStorage.removeItem('dutyflow_examinations');
      localStorage.removeItem('dutyflow_invigilators');
      localStorage.removeItem('dutyflow_active_allotment');
    } catch (_) {}
  }, []);

  // 1. When user logs in, switches accounts, or logs out: RESET and load strictly for this user
  useEffect(() => {
    const currentUserId = user?.id;

    // Reset all state when active user changes
    if (prevUserIdRef.current !== currentUserId) {
      setInvigilators([]);
      setExaminations([]);
      setSavedAllotments([]);
      setActiveAllotment(null);
      setIsCloudSynced(false);
      setIsLoaded(false);
    }
    prevUserIdRef.current = currentUserId;

    const userScope = currentUserId ? currentUserId : 'guest';
    let isMounted = true;

    try {
      // Load user-scoped drafts from localStorage
      const storedSaved = localStorage.getItem(`dutyflow_${userScope}_saved_allotments`);
      if (storedSaved) {
        const parsed = JSON.parse(storedSaved);
        if (Array.isArray(parsed) && isMounted) {
          setSavedAllotments(parsed.map((a: any) => ({
            ...a,
            createdAt: new Date(a.createdAt),
            examinations: (a.examinations || []).map((e: any) => ({ ...e, date: new Date(e.date) })),
          })));
        }
      }

      const storedExams = localStorage.getItem(`dutyflow_${userScope}_examinations`);
      if (storedExams) {
        const parsed = JSON.parse(storedExams);
        if (Array.isArray(parsed) && isMounted) {
          setExaminations(parsed.map((e: any) => ({ ...e, date: new Date(e.date) })));
        }
      }

      const storedInvs = localStorage.getItem(`dutyflow_${userScope}_invigilators`);
      if (storedInvs) {
        const parsed = JSON.parse(storedInvs);
        if (Array.isArray(parsed) && isMounted) {
          setInvigilators(parsed);
        }
      }

      const storedActive = localStorage.getItem(`dutyflow_${userScope}_active_allotment`);
      if (storedActive) {
        const parsed = JSON.parse(storedActive);
        if (parsed && parsed.id && isMounted) {
          setActiveAllotment({
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            examinations: (parsed.examinations || []).map((e: any) => ({ ...e, date: new Date(e.date) })),
          });
        }
      }
    } catch (err) {
      console.error("Error loading user-scoped allotment data from localStorage:", err);
    }

    // If logged in, fetch cloud allotments strictly for this specific user.id
    if (currentUserId) {
      fetchUserAllotmentsFromDatabase(currentUserId).then((cloudAllotments) => {
        if (!isMounted) return;
        if (cloudAllotments) {
          // Replace state with strictly this user's cloud saved allotments
          setSavedAllotments(cloudAllotments);
          setIsCloudSynced(true);
        }
      }).catch(err => {
        console.error("Cloud allotment fetch error:", err);
      }).finally(() => {
        if (isMounted) setIsLoaded(true);
      });
    } else {
      setIsLoaded(true);
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // 2. Save state changes strictly to user-scoped localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(getStorageKey('saved_allotments'), JSON.stringify(savedAllotments));
    } catch (e) {
      console.error("Failed to save allotments to localStorage:", e);
    }
  }, [savedAllotments, isLoaded, getStorageKey]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(getStorageKey('examinations'), JSON.stringify(examinations));
    } catch (e) {
      console.error("Failed to save examinations to localStorage:", e);
    }
  }, [examinations, isLoaded, getStorageKey]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(getStorageKey('invigilators'), JSON.stringify(invigilators));
    } catch (e) {
      console.error("Failed to save invigilators to localStorage:", e);
    }
  }, [invigilators, isLoaded, getStorageKey]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (activeAllotment) {
        localStorage.setItem(getStorageKey('active_allotment'), JSON.stringify(activeAllotment));
      } else {
        localStorage.removeItem(getStorageKey('active_allotment'));
      }
    } catch (e) {
      console.error("Failed to save active allotment to localStorage:", e);
    }
  }, [activeAllotment, isLoaded, getStorageKey]);

  // When activeAllotment changes to a specific saved allotment, sync its exams & invigilators
  useEffect(() => {
    if (activeAllotment) {
      setInvigilators(activeAllotment.invigilators || []);
      setExaminations((activeAllotment.examinations || []).map(e => ({ ...e, date: new Date(e.date) })));
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

      if (user?.id) {
        syncAllotmentToDatabase(updated, user.id);
      }
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

      if (user?.id) {
        syncAllotmentToDatabase(newSavedAllotment, user.id);
      }
      return newSavedAllotment;
    }
  }, [activeAllotment, savedAllotments, invigilators, examinations, user?.id]);
  
  const updateSavedAllotment = (id: string, updatedAllotment: Partial<SavedAllotment>) => {
    setSavedAllotments(prev => prev.map(sa => {
      if (sa.id === id) {
        const updated = { ...sa, ...updatedAllotment };
        if (user?.id) {
          syncAllotmentToDatabase(updated, user.id);
        }
        return updated;
      }
      return sa;
    }));

    if (activeAllotment?.id === id) {
      setActiveAllotment(prev => prev ? { ...prev, ...updatedAllotment } : null);
    }
  };

  const deleteSavedAllotment = (id: string) => {
    setSavedAllotments(prev => prev.filter(sa => sa.id !== id));
    if (activeAllotment?.id === id) {
      setActiveAllotment(null);
    }
    if (user?.id) {
      deleteUserAllotmentFromDatabase(id, user.id);
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
      clearCurrentAllotment,
      isCloudSynced
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
