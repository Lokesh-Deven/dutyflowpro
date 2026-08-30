"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { Invigilator, Examination, SavedAllotment, AllotmentResult, InstructionItem } from '@/lib/types';
import { useAuth } from './auth-context';
import {
  syncAllotmentToDatabase,
  fetchUserAllotmentsFromDatabase,
  deleteUserAllotmentFromDatabase
} from './storage-service';

export const DEFAULT_INSTRUCTIONS: InstructionItem[] = [
  {
    id: "inst-1",
    text: "Report to the examination hall at least 15 minutes before the commencement of the examination.",
    enabled: true,
  },
  {
    id: "inst-2",
    text: "Verify the question papers, answer booklets, and other required materials before the examination begins.",
    enabled: true,
  },
  {
    id: "inst-3",
    text: "Ensure that students are seated according to the approved seating arrangement and that their identity is verified.",
    enabled: true,
  },
  {
    id: "inst-4",
    text: "Instruct students to keep mobile phones, smart watches, electronic devices, and unauthorized materials away from the examination area.",
    enabled: true,
  },
  {
    id: "inst-5",
    text: "Distribute question papers and answer booklets only at the scheduled time and ensure that students follow the instructions printed on them.",
    enabled: true,
  },
  {
    id: "inst-6",
    text: "Maintain strict silence and discipline throughout the examination and avoid unnecessary conversation with students.",
    enabled: true,
  },
  {
    id: "inst-7",
    text: "Do not provide students with any assistance relating to the content or answers to examination questions.",
    enabled: true,
  },
  {
    id: "inst-8",
    text: "Monitor the examination hall continuously and report any malpractice, suspicious activity, or irregularity immediately to the Chief Superintendent.",
    enabled: true,
  },
  {
    id: "inst-9",
    text: "Ensure that students do not leave the examination hall without permission and follow the prescribed rules regarding early submission.",
    enabled: true,
  },
  {
    id: "inst-10",
    text: "At the end of the examination, collect and count all answer scripts carefully, arrange them as instructed, and hand them over to the designated authority.",
    enabled: true,
  },
];

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
  instructions: InstructionItem[];
  setInstructions: React.Dispatch<React.SetStateAction<InstructionItem[]>>;
  addInstruction: (text: string) => void;
  updateInstruction: (id: string, text: string) => void;
  toggleInstruction: (id: string) => void;
  deleteInstruction: (id: string) => void;
  resetInstructionsToDefault: () => void;
}

const AllotmentContext = createContext<AllotmentContextType | undefined>(undefined);

export function AllotmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [savedAllotments, setSavedAllotments] = useState<SavedAllotment[]>([]);
  const [activeAllotment, setActiveAllotment] = useState<SavedAllotment | null>(null);
  const [instructions, setInstructions] = useState<InstructionItem[]>(DEFAULT_INSTRUCTIONS);
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
      localStorage.removeItem('dutyflow_instructions');
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
      setInstructions(DEFAULT_INSTRUCTIONS);
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

      // Check version of stored instructions to ensure upgrade to latest user-specified defaults
      const versionKey = `dutyflow_${userScope}_inst_version`;
      const storedVersion = localStorage.getItem(versionKey);

      if (storedVersion !== 'v2') {
        setInstructions(DEFAULT_INSTRUCTIONS);
        localStorage.setItem(`dutyflow_${userScope}_instructions`, JSON.stringify(DEFAULT_INSTRUCTIONS));
        localStorage.setItem(versionKey, 'v2');
      } else {
        const storedInstructions = localStorage.getItem(`dutyflow_${userScope}_instructions`);
        if (storedInstructions) {
          const parsed = JSON.parse(storedInstructions);
          if (Array.isArray(parsed) && isMounted && parsed.length > 0) {
            setInstructions(parsed);
          }
        } else {
          setInstructions(DEFAULT_INSTRUCTIONS);
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

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(getStorageKey('instructions'), JSON.stringify(instructions));
    } catch (e) {
      console.error("Failed to save instructions to localStorage:", e);
    }
  }, [instructions, isLoaded, getStorageKey]);

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

  const addInstruction = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newItem: InstructionItem = {
      id: `inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: trimmed,
      enabled: true,
    };
    setInstructions(prev => [...prev, newItem]);
  };

  const updateInstruction = (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInstructions(prev => prev.map(item => item.id === id ? { ...item, text: trimmed } : item));
  };

  const toggleInstruction = (id: string) => {
    setInstructions(prev => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
  };

  const deleteInstruction = (id: string) => {
    setInstructions(prev => prev.filter(item => item.id !== id));
  };

  const resetInstructionsToDefault = () => {
    setInstructions(DEFAULT_INSTRUCTIONS);
  };

  return (
    <AllotmentContext.Provider value={{
      invigilators, setInvigilators,
      examinations, setExaminations,
      savedAllotments, saveCurrentAllotment,
      activeAllotment, setActiveAllotment,
      updateSavedAllotment, deleteSavedAllotment,
      clearCurrentAllotment,
      isCloudSynced,
      instructions, setInstructions,
      addInstruction,
      updateInstruction,
      toggleInstruction,
      deleteInstruction,
      resetInstructionsToDefault
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
