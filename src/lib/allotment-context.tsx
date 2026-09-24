"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { Invigilator, DirectoryInvigilator, Examination, SavedAllotment, AllotmentResult, InstructionItem, SignatoryInfo, MasterRoom, SessionRoomAllocation } from '@/lib/types';
import { useAuth } from './auth-context';
import {
  syncAllotmentToDatabase,
  fetchUserAllotmentsFromDatabase,
  deleteUserAllotmentFromDatabase,
  saveUserDirectoryToCloud,
  fetchUserDirectoryFromCloud,
  syncUserWorkspaceToDatabase,
  fetchUserWorkspaceFromDatabase,
  isUUID,
} from './storage-service';
import { supabase } from './supabase';
import { PaletteId, DEFAULT_PALETTE_ID, PDF_PALETTES } from './pdf-palette';

export const DEFAULT_MASTER_ROOMS: MasterRoom[] = [
  { id: 'room-101', name: '101' },
  { id: 'room-102', name: '102' },
  { id: 'room-n102', name: 'N102' },
  { id: 'room-103', name: '103' },
  { id: 'room-104', name: '104' },
  { id: 'room-conf', name: 'Conference Room' },
  { id: 'room-sem', name: 'Seminar Hall' },
];

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
  saveCurrentAllotment: (
    name: string,
    assignments: AllotmentResult['assignments'],
    options?: { mode?: 'replace' | 'new'; targetId?: string }
  ) => SavedAllotment;
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
  moveInstruction: (fromIndex: number, toIndex: number) => void;
  reorderInstructions: (newInstructions: InstructionItem[]) => void;
  saveInstructions: (customInstructions?: InstructionItem[]) => Promise<boolean>;
  resetInstructionsToDefault: () => void;
  signatory: SignatoryInfo;
  setSignatory: React.Dispatch<React.SetStateAction<SignatoryInfo>>;
  updateSignatory: (data: Partial<SignatoryInfo>) => Promise<void> | void;
  resetSignatory: () => Promise<void> | void;
  directoryInvigilators: DirectoryInvigilator[];
  setDirectoryInvigilators: React.Dispatch<React.SetStateAction<DirectoryInvigilator[]>>;
  addDirectoryInvigilator: (item: Omit<DirectoryInvigilator, 'id'>) => void;
  addDirectoryInvigilatorsBulk: (items: Omit<DirectoryInvigilator, 'id'>[]) => void;
  updateDirectoryInvigilator: (id: string, updated: Partial<DirectoryInvigilator>) => void;
  deleteDirectoryInvigilator: (id: string) => void;
  clearDirectoryInvigilators: () => void;
  saveDirectoryToCloud: () => Promise<{ success: boolean; error?: any }>;
  isDirectoryCloudSynced: boolean;
  pdfPaletteId: PaletteId;
  setPdfPaletteId: (id: PaletteId) => void;
  masterRooms: MasterRoom[];
  setMasterRooms: React.Dispatch<React.SetStateAction<MasterRoom[]>>;
  addMasterRoom: (name: string) => void;
  updateMasterRoom: (id: string, name: string) => void;
  deleteMasterRoom: (id: string) => void;
  saveSessionRooms: (examId: string, rooms: string[]) => void;
  saveSessionAllocation: (examId: string, allocation: SessionRoomAllocation) => void;
  clearAllSessionAllocations: (allotmentId?: string) => void;
  clearSessionAllocation: (examId: string) => void;
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
  const [directoryInvigilators, setDirectoryInvigilators] = useState<DirectoryInvigilator[]>([]);
  const [pdfPaletteId, setPdfPaletteIdState] = useState<PaletteId>(DEFAULT_PALETTE_ID);
  const [masterRooms, setMasterRooms] = useState<MasterRoom[]>(DEFAULT_MASTER_ROOMS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [isDirectoryCloudSynced, setIsDirectoryCloudSynced] = useState(false);

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
    } catch (_) { }
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
      setDirectoryInvigilators([]);
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

      // Examination and invigilator details pages MUST start clear of all details on login
      setExaminations([]);
      setInvigilators([]);
      setActiveAllotment(null);

      // Purge any lingering draft keys from storage
      localStorage.removeItem(`dutyflow_${userScope}_examinations`);
      localStorage.removeItem(`dutyflow_${userScope}_invigilators`);
      localStorage.removeItem(`dutyflow_${userScope}_active_allotment`);
      localStorage.removeItem('dutyflow_guest_examinations');
      localStorage.removeItem('dutyflow_guest_invigilators');
      localStorage.removeItem('dutyflow_guest_active_allotment');
      sessionStorage.removeItem(`dutyflow_${userScope}_examinations`);
      sessionStorage.removeItem(`dutyflow_${userScope}_invigilators`);
      sessionStorage.removeItem(`dutyflow_${userScope}_active_allotment`);

      // Load user-scoped directory invigilators from localStorage
      const storedDir = localStorage.getItem(`dutyflow_${userScope}_invigilator_directory`);
      if (storedDir) {
        try {
          const parsed = JSON.parse(storedDir);
          if (Array.isArray(parsed) && isMounted) {
            setDirectoryInvigilators(parsed);
          }
        } catch (_) { }
      } else if (userScope !== 'guest') {
        const guestDir = localStorage.getItem('dutyflow_guest_invigilator_directory');
        if (guestDir) {
          try {
            const parsed = JSON.parse(guestDir);
            if (Array.isArray(parsed) && isMounted && parsed.length > 0) {
              setDirectoryInvigilators(parsed);
              localStorage.setItem(`dutyflow_${userScope}_invigilator_directory`, guestDir);
            }
          } catch (_) { }
        }
      }

      // Load user-scoped PDF palette from localStorage
      try {
        const storedPalette = localStorage.getItem(`dutyflow_${userScope}_pdf_color_palette`) || localStorage.getItem('dutyflow_pdf_color_palette');
        if (storedPalette && storedPalette in PDF_PALETTES && isMounted) {
          setPdfPaletteIdState(storedPalette as PaletteId);
        }
      } catch (_) { }

      // Load user-scoped master rooms from localStorage
      try {
        const storedRooms = localStorage.getItem(`dutyflow_${userScope}_master_rooms`);
        if (storedRooms) {
          const parsed = JSON.parse(storedRooms);
          if (Array.isArray(parsed) && isMounted) {
            setMasterRooms(parsed);
          }
        } else if (userScope !== 'guest') {
          const guestRooms = localStorage.getItem('dutyflow_guest_master_rooms');
          if (guestRooms) {
            const parsed = JSON.parse(guestRooms);
            if (Array.isArray(parsed) && isMounted && parsed.length > 0) {
              setMasterRooms(parsed);
              localStorage.setItem(`dutyflow_${userScope}_master_rooms`, guestRooms);
            }
          }
        }

        if (userScope !== 'guest' && user?.id && isUUID(user.id)) {
          const metaRooms = (user as any)?.user_metadata?.invigilation_master_rooms;
          if (Array.isArray(metaRooms) && metaRooms.length > 0 && isMounted) {
            setMasterRooms(metaRooms);
            localStorage.setItem(`dutyflow_${userScope}_master_rooms`, JSON.stringify(metaRooms));
          }
        }
      } catch (_) { }

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
        } catch (_) { }
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
          } catch (_) { }
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
        const storedInstructions = localStorage.getItem(`dutyflow_${userScope}_instructions`);
        if (storedInstructions) {
          try {
            const parsed = JSON.parse(storedInstructions);
            if (Array.isArray(parsed) && isMounted && parsed.length > 0) {
              setInstructions(parsed);
              localStorage.setItem(versionKey, 'v2');
            } else {
              setInstructions(DEFAULT_INSTRUCTIONS);
              localStorage.setItem(`dutyflow_${userScope}_instructions`, JSON.stringify(DEFAULT_INSTRUCTIONS));
              localStorage.setItem(versionKey, 'v2');
            }
          } catch {
            setInstructions(DEFAULT_INSTRUCTIONS);
            localStorage.setItem(`dutyflow_${userScope}_instructions`, JSON.stringify(DEFAULT_INSTRUCTIONS));
            localStorage.setItem(versionKey, 'v2');
          }
        } else {
          setInstructions(DEFAULT_INSTRUCTIONS);
          localStorage.setItem(`dutyflow_${userScope}_instructions`, JSON.stringify(DEFAULT_INSTRUCTIONS));
          localStorage.setItem(versionKey, 'v2');
        }
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

    // CENTRAL CLOUD RESTORATION:
    // If logged in with a valid user UUID, fetch cloud allotments, workspace, signatory, and directory strictly for this specific user.id
    if (currentUserId && isUUID(currentUserId)) {
      Promise.all([
        fetchUserAllotmentsFromDatabase(currentUserId),
        fetchUserWorkspaceFromDatabase(currentUserId),
        fetchUserDirectoryFromCloud(currentUserId),
      ]).then(([cloudAllotments, ws, cloudDir]) => {
        if (!isMounted) return;

        // 1. Restore Instructions from central database
        if (ws?.instructions && Array.isArray(ws.instructions) && ws.instructions.length > 0) {
          setInstructions(ws.instructions);
          try {
            localStorage.setItem(`dutyflow_${userScope}_instructions`, JSON.stringify(ws.instructions));
            localStorage.setItem(`dutyflow_${userScope}_inst_version`, 'v2');
          } catch (_) { }
        }

        // 2. Restore Master Rooms from central database
        if (ws?.masterRooms && Array.isArray(ws.masterRooms) && ws.masterRooms.length > 0) {
          setMasterRooms(ws.masterRooms);
          try {
            localStorage.setItem(`dutyflow_${userScope}_master_rooms`, JSON.stringify(ws.masterRooms));
          } catch (_) { }
        }

        // 3. Restore PDF palette
        if (ws?.pdfPaletteId && ws.pdfPaletteId in PDF_PALETTES) {
          setPdfPaletteIdState(ws.pdfPaletteId as PaletteId);
        }

        // 4. Restore signatory (prefer workspace, fallback to profiles)
        if (ws?.signatory && (ws.signatory.name || ws.signatory.designation)) {
          setSignatory(ws.signatory);
        }

        // 5. Restore Directory
        if (cloudDir && Array.isArray(cloudDir) && cloudDir.length > 0) {
          setDirectoryInvigilators(cloudDir);
          setIsDirectoryCloudSynced(true);
          try {
            localStorage.setItem(`dutyflow_${userScope}_invigilator_directory`, JSON.stringify(cloudDir));
          } catch (_) { }
        }

        // 6. Restore Saved Allotments & Active Allotment Progress
        if (cloudAllotments && Array.isArray(cloudAllotments)) {
          setSavedAllotments(cloudAllotments);
          try {
            localStorage.setItem(`dutyflow_${userScope}_saved_allotments`, JSON.stringify(cloudAllotments));
          } catch (_) { }

          // Cross-device Active Allotment synchronization:
          // User continues seamlessly where they left off on their other device!
          if (ws?.activeAllotmentId) {
            const match = cloudAllotments.find((a) => a.id === ws.activeAllotmentId);
            if (match) {
              setActiveAllotment(match);
            } else if (cloudAllotments.length > 0) {
              setActiveAllotment(cloudAllotments[0]);
            }
          } else if (cloudAllotments.length > 0) {
            setActiveAllotment(cloudAllotments[0]);
          }

          setIsCloudSynced(true);
        }
      }).catch((err) => {
        console.error("Cloud allotment & workspace fetch error:", err?.message || err);
      }).finally(() => {
        if (isMounted) setIsLoaded(true);
      });

      // Also fetch cloud-saved signatory details from Supabase profiles as backup
      (async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('signatory_name, signatory_designation')
            .eq('id', currentUserId)
            .maybeSingle();

          if (error) {
            console.error("Cloud signatory query error:", error.message || error);
            return;
          }

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
              } catch (_) { }
              return cloudSig;
            });
          }
        } catch (err: any) {
          console.error("Cloud signatory fetch error:", err?.message || err);
        }
      })();
    } else {
      setIsLoaded(true);
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Window Focus Cross-Device Auto-Refresh
  useEffect(() => {
    if (!user?.id || !isUUID(user.id)) return;

    const handleWindowFocus = () => {
      Promise.all([
        fetchUserAllotmentsFromDatabase(user.id),
        fetchUserWorkspaceFromDatabase(user.id),
      ]).then(([cloudAllotments, ws]) => {
        if (ws?.instructions?.length) setInstructions(ws.instructions);
        if (ws?.masterRooms?.length) setMasterRooms(ws.masterRooms);
        if (cloudAllotments && Array.isArray(cloudAllotments)) {
          setSavedAllotments(cloudAllotments);
          if (ws?.activeAllotmentId) {
            const match = cloudAllotments.find((a) => a.id === ws.activeAllotmentId);
            if (match) setActiveAllotment(match);
          }
        }
      }).catch(() => {});
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
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

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(getStorageKey('invigilator_directory'), JSON.stringify(directoryInvigilators));
    } catch (e) {
      console.error("Failed to save invigilator directory to localStorage:", e);
    }
  }, [directoryInvigilators, isLoaded, getStorageKey]);

  // When activeAllotment changes to a specific saved allotment, sync its exams & invigilators
  useEffect(() => {
    if (activeAllotment) {
      setInvigilators(activeAllotment.invigilators || []);
      setExaminations((activeAllotment.examinations || []).map(e => ({ ...e, date: new Date(e.date) })));
    }
  }, [activeAllotment]);

  // Synchronize Active Allotment selection to central cloud workspace across all user devices
  useEffect(() => {
    if (!isLoaded || !user?.id || !isUUID(user.id)) return;
    syncUserWorkspaceToDatabase(user.id, { activeAllotmentId: activeAllotment?.id || null }).catch(() => {});
  }, [activeAllotment?.id, isLoaded, user?.id]);

  const saveCurrentAllotment = useCallback((
    name: string,
    assignments: AllotmentResult['assignments'],
    options?: { mode?: 'replace' | 'new'; targetId?: string }
  ) => {
    const trimmedName = name.trim() || 'Untitled Allotment';
    const mode = options?.mode;
    const targetId = options?.targetId;

    // 1. Explicit replace mode for a specific target allotment ID
    if (mode === 'replace' && targetId) {
      const existing = savedAllotments.find(sa => sa.id === targetId);
      if (existing) {
        const updated: SavedAllotment = {
          ...existing,
          name: trimmedName,
          invigilators,
          examinations,
          assignments,
        };
        setSavedAllotments(prev => prev.map(sa => sa.id === targetId ? updated : sa));
        setActiveAllotment(updated);

        if (user?.id) {
          syncAllotmentToDatabase(updated, user.id);
        }
        return updated;
      }
    }

    // 2. Default: If not explicitly 'new', and activeAllotment exists in savedAllotments, update it
    if (mode !== 'new' && activeAllotment && savedAllotments.some(sa => sa.id === activeAllotment.id)) {
      const updated: SavedAllotment = {
        ...activeAllotment,
        name: trimmedName,
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
    }

    // 3. Otherwise (or if mode === 'new'): Create brand new SavedAllotment
    const newSavedAllotment: SavedAllotment = {
      id: `allotment-${Date.now()}`,
      name: trimmedName,
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

  const clearCurrentAllotment = useCallback(() => {
    setActiveAllotment(null);
    setInvigilators([]);
    setExaminations([]);
    if (typeof window !== 'undefined') {
      try {
        const scope = user?.id ? user.id : 'guest';
        localStorage.removeItem(`dutyflow_${scope}_examinations`);
        localStorage.removeItem(`dutyflow_${scope}_invigilators`);
        localStorage.removeItem(`dutyflow_${scope}_active_allotment`);
        localStorage.removeItem('dutyflow_guest_examinations');
        localStorage.removeItem('dutyflow_guest_invigilators');
        localStorage.removeItem('dutyflow_guest_active_allotment');
        sessionStorage.removeItem(`dutyflow_${scope}_examinations`);
        sessionStorage.removeItem(`dutyflow_${scope}_invigilators`);
        sessionStorage.removeItem(`dutyflow_${scope}_active_allotment`);
      } catch (_) { }
    }
  }, [user?.id]);

  const addInstruction = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newItem: InstructionItem = {
      id: `inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: trimmed,
      enabled: true,
    };
    setInstructions(prev => {
      const updated = [...prev, newItem];
      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { instructions: updated }).catch(() => {});
      }
      return updated;
    });
  };

  const updateInstruction = (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInstructions(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, text: trimmed } : item);
      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { instructions: updated }).catch(() => {});
      }
      return updated;
    });
  };

  const toggleInstruction = (id: string) => {
    setInstructions(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item);
      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { instructions: updated }).catch(() => {});
      }
      return updated;
    });
  };

  const deleteInstruction = (id: string) => {
    setInstructions(prev => {
      const updated = prev.filter(item => item.id !== id);
      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { instructions: updated }).catch(() => {});
      }
      return updated;
    });
  };

  const moveInstruction = (fromIndex: number, toIndex: number) => {
    setInstructions(prev => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length || fromIndex === toIndex) {
        return prev;
      }
      const updated = [...prev];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { instructions: updated }).catch(() => {});
      }
      return updated;
    });
  };

  const reorderInstructions = (newInstructions: InstructionItem[]) => {
    setInstructions(newInstructions);
    if (user?.id && isUUID(user.id)) {
      syncUserWorkspaceToDatabase(user.id, { instructions: newInstructions }).catch(() => {});
    }
  };

  const saveInstructions = async (customInstructions?: InstructionItem[]): Promise<boolean> => {
    const dataToSave = customInstructions || instructions;
    const userScope = user?.id ? user.id : 'guest';
    try {
      localStorage.setItem(`dutyflow_${userScope}_instructions`, JSON.stringify(dataToSave));
      localStorage.setItem(`dutyflow_${userScope}_inst_version`, 'v2');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('dutyflow_session_instructions', JSON.stringify(dataToSave));
      }
      if (userScope === 'guest') {
        localStorage.setItem('dutyflow_guest_instructions', JSON.stringify(dataToSave));
      }
    } catch (err) {
      console.error("Failed to save instructions to localStorage/sessionStorage:", err);
      return false;
    }

    if (user?.id && isUUID(user.id)) {
      try {
        await syncUserWorkspaceToDatabase(user.id, { instructions: dataToSave });
      } catch (err: any) {
        console.warn("Cloud sync for instructions error:", err?.message || err);
      }
    }
    return true;
  };

  const resetInstructionsToDefault = () => {
    setInstructions(DEFAULT_INSTRUCTIONS);
    if (user?.id && isUUID(user.id)) {
      syncUserWorkspaceToDatabase(user.id, { instructions: DEFAULT_INSTRUCTIONS }).catch(() => {});
    }
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

    if (user?.id && isUUID(user.id)) {
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
        await syncUserWorkspaceToDatabase(user.id, { signatory: updated });
      } catch (err: any) {
        console.error("Failed to sync signatory to cloud profile:", err?.message || err);
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

    if (user?.id && isUUID(user.id)) {
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
        await syncUserWorkspaceToDatabase(user.id, { signatory: DEFAULT_SIGNATORY });
      } catch (err: any) {
        console.error("Failed to reset signatory in Supabase:", err?.message || err);
      }
    }
  };

  const addDirectoryInvigilator = useCallback((item: Omit<DirectoryInvigilator, 'id'>) => {
    const newItem: DirectoryInvigilator = {
      id: `dir-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...item,
      createdAt: new Date().toISOString(),
    };
    setDirectoryInvigilators(prev => [newItem, ...prev]);
    setIsDirectoryCloudSynced(false);
  }, []);

  const addDirectoryInvigilatorsBulk = useCallback((items: Omit<DirectoryInvigilator, 'id'>[]) => {
    const newItems: DirectoryInvigilator[] = items.map((item, index) => ({
      id: `dir-bulk-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
      ...item,
      createdAt: new Date().toISOString(),
    }));
    setDirectoryInvigilators(prev => [...newItems, ...prev]);
    setIsDirectoryCloudSynced(false);
  }, []);

  const updateDirectoryInvigilator = useCallback((id: string, updated: Partial<DirectoryInvigilator>) => {
    setDirectoryInvigilators(prev => prev.map(inv => inv.id === id ? { ...inv, ...updated } : inv));
    setIsDirectoryCloudSynced(false);
  }, []);

  const deleteDirectoryInvigilator = useCallback((id: string) => {
    setDirectoryInvigilators(prev => prev.filter(inv => inv.id !== id));
    setIsDirectoryCloudSynced(false);
  }, []);

  const clearDirectoryInvigilators = useCallback(() => {
    setDirectoryInvigilators([]);
    setIsDirectoryCloudSynced(false);
  }, []);

  const setPdfPaletteId = useCallback((id: PaletteId) => {
    setPdfPaletteIdState(id);
    const scope = user?.id ? user.id : 'guest';
    try {
      localStorage.setItem(`dutyflow_${scope}_pdf_color_palette`, id);
      localStorage.setItem('dutyflow_pdf_color_palette', id);
    } catch (e) {
      console.error("Failed to save PDF palette to localStorage:", e);
    }
    if (user?.id && isUUID(user.id)) {
      syncUserWorkspaceToDatabase(user.id, { pdfPaletteId: id }).catch(() => {});
    }
  }, [user?.id]);

  const saveDirectoryToCloud = useCallback(async (): Promise<{ success: boolean; error?: any }> => {
    const userScope = user?.id ? user.id : 'guest';
    try {
      localStorage.setItem(`dutyflow_${userScope}_invigilator_directory`, JSON.stringify(directoryInvigilators));
      if (userScope === 'guest') {
        localStorage.setItem('dutyflow_guest_invigilator_directory', JSON.stringify(directoryInvigilators));
      }
    } catch (e) {
      console.error("Failed to save directory to localStorage:", e);
    }

    if (!user?.id) {
      return { success: true };
    }

    const res = await saveUserDirectoryToCloud(directoryInvigilators, user.id);
    if (res.success) {
      setIsDirectoryCloudSynced(true);
    }
    return res;
  }, [user?.id, directoryInvigilators]);

  const addMasterRoom = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newRoom: MasterRoom = {
      id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: trimmed,
    };
    setMasterRooms(prev => {
      const updated = [...prev, newRoom];
      try {
        localStorage.setItem(getStorageKey('master_rooms'), JSON.stringify(updated));
        if (user?.id && isUUID(user.id)) {
          supabase.auth.updateUser({ data: { invigilation_master_rooms: updated } }).catch(() => {});
          syncUserWorkspaceToDatabase(user.id, { masterRooms: updated }).catch(() => {});
        }
      } catch (_) { }
      return updated;
    });
  }, [getStorageKey, user?.id]);

  const updateMasterRoom = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setMasterRooms(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, name: trimmed } : r);
      try {
        localStorage.setItem(getStorageKey('master_rooms'), JSON.stringify(updated));
        if (user?.id && isUUID(user.id)) {
          supabase.auth.updateUser({ data: { invigilation_master_rooms: updated } }).catch(() => {});
          syncUserWorkspaceToDatabase(user.id, { masterRooms: updated }).catch(() => {});
        }
      } catch (_) { }
      return updated;
    });
  }, [getStorageKey, user?.id]);

  const deleteMasterRoom = useCallback((id: string) => {
    setMasterRooms(prev => {
      const updated = prev.filter(r => r.id !== id);
      try {
        localStorage.setItem(getStorageKey('master_rooms'), JSON.stringify(updated));
        if (user?.id && isUUID(user.id)) {
          supabase.auth.updateUser({ data: { invigilation_master_rooms: updated } }).catch(() => {});
          syncUserWorkspaceToDatabase(user.id, { masterRooms: updated }).catch(() => {});
        }
      } catch (_) { }
      return updated;
    });
  }, [getStorageKey, user?.id]);

  const saveSessionRooms = useCallback((examId: string, rooms: string[]) => {
    if (!activeAllotment) return;
    const currentAllocation: SessionRoomAllocation = activeAllotment.roomAllocations?.[examId] || {
      examId,
      selectedRooms: [],
      invigilatorDuties: [],
      relieverDuties: [],
      status: 'Pending',
    };
    const updatedAllocation: SessionRoomAllocation = {
      ...currentAllocation,
      selectedRooms: rooms,
    };
    const updatedRoomAllocations = {
      ...(activeAllotment.roomAllocations || {}),
      [examId]: updatedAllocation,
    };
    updateSavedAllotment(activeAllotment.id, {
      roomAllocations: updatedRoomAllocations,
    });
  }, [activeAllotment, updateSavedAllotment]);

  const saveSessionAllocation = useCallback((examId: string, allocation: SessionRoomAllocation) => {
    if (!activeAllotment) return;
    const updatedRoomAllocations = {
      ...(activeAllotment.roomAllocations || {}),
      [examId]: allocation,
    };
    updateSavedAllotment(activeAllotment.id, {
      roomAllocations: updatedRoomAllocations,
    });
  }, [activeAllotment, updateSavedAllotment]);

  const clearAllSessionAllocations = useCallback((allotmentId?: string) => {
    const targetId = allotmentId || activeAllotment?.id;
    if (!targetId) return;
    updateSavedAllotment(targetId, {
      roomAllocations: {},
    });
  }, [activeAllotment?.id, updateSavedAllotment]);

  const clearSessionAllocation = useCallback((examId: string) => {
    if (!activeAllotment) return;
    const updatedRoomAllocations = { ...(activeAllotment.roomAllocations || {}) };
    delete updatedRoomAllocations[examId];
    updateSavedAllotment(activeAllotment.id, {
      roomAllocations: updatedRoomAllocations,
    });
  }, [activeAllotment, updateSavedAllotment]);

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
      moveInstruction,
      reorderInstructions,
      saveInstructions,
      resetInstructionsToDefault,
      signatory, setSignatory,
      updateSignatory,
      resetSignatory,
      directoryInvigilators, setDirectoryInvigilators,
      addDirectoryInvigilator,
      addDirectoryInvigilatorsBulk,
      updateDirectoryInvigilator,
      deleteDirectoryInvigilator,
      clearDirectoryInvigilators,
      saveDirectoryToCloud,
      isDirectoryCloudSynced,
      pdfPaletteId,
      setPdfPaletteId,
      masterRooms,
      setMasterRooms,
      addMasterRoom,
      updateMasterRoom,
      deleteMasterRoom,
      saveSessionRooms,
      saveSessionAllocation,
      clearAllSessionAllocations,
      clearSessionAllocation,
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
