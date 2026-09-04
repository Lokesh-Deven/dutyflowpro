"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { Invigilator, Examination, SavedAllotment, AllotmentResult, InstructionItem, SignatoryInfo } from '@/lib/types';
import { useAuth } from './auth-context';
import {
  syncAllotmentToDatabase,
  fetchUserAllotmentsFromDatabase,
  deleteUserAllotmentFromDatabase
} from './storage-service';
import { supabase } from './supabase';

export const DEFAULT_SIGNATORY: SignatoryInfo = {
  name: "",
  designation: "",
};

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
  signatory: SignatoryInfo;
  setSignatory: React.Dispatch<React.SetStateAction<SignatoryInfo>>;
  updateSignatory: (data: Partial<SignatoryInfo>) => Promise<void> | void;
  resetSignatory: () => Promise<void> | void;
}

const AllotmentContext = createContext<AllotmentContextType | undefined>(undefined);

export function AllotmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [savedAllotments, setSavedAllotments] = useState<SavedAllotment[]>([]);
  const [activeAllotment, setActiveAllotment] = useState<SavedAllotment | null>(null);
  const [instructions, setInstructions] = useState<InstructionItem[]>(DEFAULT_INSTRUCTIONS);
  const [signatory, setSignatory] = useState<SignatoryInfo>(DEFAULT_SIGNATORY);
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
      localStorage.removeItem('dutyflow_signatory');
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
      setSignatory(DEFAULT_SIGNATORY);
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

      // Load user-scoped signatory from localStorage
      let initialSignatory: SignatoryInfo = DEFAULT_SIGNATORY;
      const storedSignatory = localStorage.getItem(`dutyflow_${userScope}_signatory`);
      if (storedSignatory) {
        try {
          const parsed = JSON.parse(storedSignatory);
          if (parsed && typeof parsed === 'object') {
            initialSignatory = {
              name: parsed.name || '',
              designation: parsed.designation || '',
            };
          }
        } catch (_) {}
      } else if (userScope !== 'guest') {
        const guestSig = localStorage.getItem('dutyflow_guest_signatory');
        if (guestSig) {
          try {
            const parsed = JSON.parse(guestSig);
            if (parsed && typeof parsed === 'object' && (parsed.name || parsed.designation)) {
              initialSignatory = {
                name: parsed.name || '',
                designation: parsed.designation || '',
              };
              localStorage.setItem(`dutyflow_${userScope}_signatory`, JSON.stringify(initialSignatory));
            }
          } catch (_) {}
        }
      }

      // Check user metadata fallback if local storage empty
      if (!initialSignatory.name && !initialSignatory.designation && currentUserId) {
        const metaName = (user?.user_metadata?.signatory_name as string) || '';
        const metaDesig = (user?.user_metadata?.signatory_designation as string) || '';
        if (metaName || metaDesig) {
          initialSignatory = {
            name: metaName,
            designation: metaDesig,
          };
          localStorage.setItem(`dutyflow_${userScope}_signatory`, JSON.stringify(initialSignatory));
        }
      }

      if (isMounted) {
        setSignatory(initialSignatory);
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

    // If logged in, fetch cloud allotments and cloud signatory strictly for this specific user.id
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

      // Also fetch cloud-saved signatory details from Supabase profiles
      (async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('signatory_name, signatory_designation')
            .eq('id', currentUserId)
            .maybeSingle();

          if (!isMounted) return;
          if (data && (data.signatory_name || data.signatory_designation)) {
            setSignatory(prev => {
              if (prev.name || prev.designation) return prev;
              const cloudSig: SignatoryInfo = {
                name: data.signatory_name || '',
                designation: data.signatory_designation || '',
              };
              try {
                localStorage.setItem(`dutyflow_${userScope}_signatory`, JSON.stringify(cloudSig));
              } catch (_) {}
              return cloudSig;
            });
          }
        } catch (err) {
          console.error("Cloud signatory fetch error:", err);
        }
      })();
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

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(getStorageKey('signatory'), JSON.stringify(signatory));
    } catch (e) {
      console.error("Failed to save signatory to localStorage:", e);
    }
  }, [signatory, isLoaded, getStorageKey]);

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

  const updateSignatory = async (data: Partial<SignatoryInfo>) => {
    const updated: SignatoryInfo = {
      name: data.name !== undefined ? data.name : signatory.name,
      designation: data.designation !== undefined ? data.designation : signatory.designation,
    };
    setSignatory(updated);

    const userScope = user?.id ? user.id : 'guest';
    try {
      localStorage.setItem(`dutyflow_${userScope}_signatory`, JSON.stringify(updated));
      if (userScope === 'guest') {
        localStorage.setItem('dutyflow_guest_signatory', JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Failed to save signatory to localStorage:", e);
    }

    if (user?.id) {
      try {
        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (data.name !== undefined) updatePayload.signatory_name = data.name;
        if (data.designation !== undefined) updatePayload.signatory_designation = data.designation;

        await supabase.from('profiles').update(updatePayload).eq('id', user.id);

        await supabase.auth.updateUser({
          data: {
            signatory_name: updated.name,
            signatory_designation: updated.designation,
          },
        });
      } catch (err) {
        console.error("Failed to sync signatory to cloud profile:", err);
      }
    }
  };

  const resetSignatory = async () => {
    setSignatory(DEFAULT_SIGNATORY);
    const userScope = user?.id ? user.id : 'guest';
    try {
      localStorage.setItem(`dutyflow_${userScope}_signatory`, JSON.stringify(DEFAULT_SIGNATORY));
      if (userScope === 'guest') {
        localStorage.setItem('dutyflow_guest_signatory', JSON.stringify(DEFAULT_SIGNATORY));
      }
    } catch (e) {
      console.error("Failed to reset signatory in localStorage:", e);
    }

    if (user?.id) {
      try {
        await supabase.from('profiles').update({
          signatory_name: '',
          signatory_designation: '',
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);

        await supabase.auth.updateUser({
          data: {
            signatory_name: '',
            signatory_designation: '',
          },
        });
      } catch (err) {
        console.error("Failed to reset signatory in Supabase:", err);
      }
    }
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
      resetInstructionsToDefault,
      signatory, setSignatory,
      updateSignatory,
      resetSignatory
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
