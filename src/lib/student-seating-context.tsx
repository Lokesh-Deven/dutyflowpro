"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './auth-context';
import {
  isUUID,
  syncSeatingAllocationToDatabase,
  fetchUserSeatingAllocationsFromDatabase,
  deleteSeatingAllocationFromDatabase,
  syncUserWorkspaceToDatabase,
  fetchUserWorkspaceFromDatabase,
} from './storage-service';
import {
  SeatingMasterRoom,
  StudentSubject,
  StudentRecord,
  SeatingAllocationRecord,
} from './student-seating-types';
import {
  DEFAULT_STUDENT_ROOMS,
  DEFAULT_STUDENT_SUBJECTS,
  saveSeatingRoomsToCloud,
  fetchSeatingRoomsFromCloud,
} from './student-seating-service';
import {
  idbGet,
  idbSet,
  safeSetLocalStorage,
  purgeBloatedLocalStorageKeys,
} from './idb-storage';

interface StudentSeatingContextType {
  rooms: SeatingMasterRoom[];
  subjects: StudentSubject[];
  studentsBySubject: Record<string, StudentRecord[]>;
  allocations: SeatingAllocationRecord[];
  activeAllocation: SeatingAllocationRecord | null;
  setActiveAllocation: (alloc: SeatingAllocationRecord | null) => void;
  isRoomsCloudSynced: boolean;
  isCloudSynced: boolean;

  // Room Management
  addRoom: (
    roomNo: string,
    leftBenches: number,
    middleBenchesOrRight: number | undefined,
    rightBenches?: number
  ) => SeatingMasterRoom;
  updateRoom: (
    id: string,
    roomNo: string,
    leftBenches: number,
    middleBenchesOrRight: number | undefined,
    rightBenches?: number
  ) => void;
  deleteRoom: (id: string) => { success: boolean; wasInUse: boolean };
  clearRooms: () => void;
  isRoomsLocked: boolean;
  setIsRoomsLocked: (locked: boolean) => void;
  toggleRoomsLock: () => boolean;
  isRoomInUse: (roomId: string) => boolean;
  saveRoomsToStorage: (roomsToSave?: SeatingMasterRoom[]) => Promise<boolean>;

  // Subject Management
  addSubject: (name: string, code?: string, expectedStudents?: number) => StudentSubject;
  updateSubject: (id: string, data: Partial<StudentSubject>) => void;
  deleteSubject: (id: string) => void;
  clearAllSubjects: () => void;

  // Student Data Management
  saveSubjectStudents: (subjectId: string, students: StudentRecord[]) => void;
  getSubjectStudents: (subjectId: string) => StudentRecord[];
  clearSubjectStudents: (subjectId: string) => void;

  // Allocation Management
  saveAllocation: (allocation: SeatingAllocationRecord) => void;
  deleteAllocation: (id: string) => void;
  duplicateAllocation: (id: string) => SeatingAllocationRecord | null;
}

const StudentSeatingContext = createContext<StudentSeatingContextType | undefined>(undefined);

/**
 * Normalizes studentsBySubject mapping strictly by subject.id,
 * ensuring no old student data from memory/aliases is inherited by newly added subjects.
 */
function normalizeStudentsBySubject(
  students: Record<string, StudentRecord[]>,
  currentSubjects: StudentSubject[]
): Record<string, StudentRecord[]> {
  const result: Record<string, StudentRecord[]> = {};

  for (const subj of currentSubjects) {
    if (students && Array.isArray(students[subj.id])) {
      result[subj.id] = students[subj.id];
    } else {
      result[subj.id] = [];
    }
  }

  return result;
}

/**
 * Normalizes examination rooms to guarantee backwards compatibility.
 * If middleBenches is not present, <= 0, or invalid, it is treated as undefined (Nil).
 * Automatically calculates totalBenches = left + (middle || 0) + right
 * and updates capacities accordingly.
 */
function normalizeRooms(rawRooms: SeatingMasterRoom[]): SeatingMasterRoom[] {
  return rawRooms.map((r) => {
    const mBenches =
      typeof r.middleBenches === 'number' && r.middleBenches > 0
        ? r.middleBenches
        : undefined;
    const left = Math.max(0, Number(r.leftBenches) || 0);
    const right = Math.max(0, Number(r.rightBenches) || 0);
    const total = left + (mBenches || 0) + right;
    return {
      ...r,
      leftBenches: left,
      middleBenches: mBenches,
      rightBenches: right,
      totalBenches: total,
      capacityOne: total * 1,
      capacityTwo: total * 2,
      capacityThree: total * 3,
    };
  });
}

export const LEGACY_SAMPLE_SUBJECT_IDS = new Set(['subj-phy', 'subj-chem', 'subj-acc', 'subj-eng']);

/**
 * Checks whether a subject is one of the initial hardcoded sample subjects.
 */
export function isLegacySampleSubject(s: any): boolean {
  if (!s) return false;
  if (LEGACY_SAMPLE_SUBJECT_IDS.has(s.id)) return true;
  const name = String(s.name || '').trim().toLowerCase();
  const code = String(s.code || '').trim().toUpperCase();
  if (name === 'physics' && (code === 'PHY101' || s.id === 'subj-phy')) return true;
  if (name === 'chemistry' && (code === 'CHM101' || s.id === 'subj-chem')) return true;
  if (name === 'accountancy' && (code === 'ACC101' || s.id === 'subj-acc')) return true;
  if (name === 'english' && (code === 'ENG101' || s.id === 'subj-eng')) return true;
  return false;
}

/**
 * Recovers student records saved on localhost, strictly respecting user deletions
 * and stripping out legacy sample data.
 */
function recoverAllLocalStudents(scope: string): Record<string, StudentRecord[]> {
  if (typeof window === 'undefined') return {};

  const cleanMap = (parsed: Record<string, StudentRecord[]>) => {
    const cleaned: Record<string, StudentRecord[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (k.startsWith('subj-') && !LEGACY_SAMPLE_SUBJECT_IDS.has(k) && Array.isArray(v)) {
        cleaned[k] = v;
      }
    }
    return cleaned;
  };

  // Priority 1: User-scoped key (if present, even if empty {}, respect user choice)
  try {
    const raw = localStorage.getItem(`dutyflow_${scope}_seating_students`);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return cleanMap(parsed);
      }
    }
  } catch (_) {}

  // Priority 2: Guest-scoped key
  if (scope !== 'guest') {
    try {
      const raw = localStorage.getItem('dutyflow_guest_seating_students');
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return cleanMap(parsed);
        }
      }
    } catch (_) {}
  }

  return {};
}

/**
 * Recovers subjects saved on localhost, strictly respecting user deletions
 * and never re-injecting sample subjects.
 */
function recoverAllLocalSubjects(scope: string): StudentSubject[] {
  if (typeof window === 'undefined') return [];

  // Priority 1: User-scoped key (if present, even if empty [], respect user choice)
  try {
    const raw = localStorage.getItem(`dutyflow_${scope}_seating_subjects`);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((s) => !isLegacySampleSubject(s));
      }
    }
  } catch (_) {}

  // Priority 2: Guest-scoped key
  if (scope !== 'guest') {
    try {
      const raw = localStorage.getItem('dutyflow_guest_seating_subjects');
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((s) => !isLegacySampleSubject(s));
        }
      }
    } catch (_) {}
  }

  return [];
}

export function StudentSeatingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<SeatingMasterRoom[]>(DEFAULT_STUDENT_ROOMS);
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [studentsBySubject, setStudentsBySubject] = useState<Record<string, StudentRecord[]>>({});
  const [allocations, setAllocations] = useState<SeatingAllocationRecord[]>([]);
  const [activeAllocation, setActiveAllocation] = useState<SeatingAllocationRecord | null>(null);
  const [isRoomsCloudSynced, setIsRoomsCloudSynced] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const prevUserIdRef = useRef<string | undefined>(undefined);
  const isInitialLoadDoneRef = useRef<boolean>(false);

  const [isRoomsLocked, setIsRoomsLockedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const scope = user?.id ? user.id : 'guest';
      return localStorage.getItem(`dutyflow_${scope}_rooms_locked`) === 'true';
    } catch {
      return false;
    }
  });

  const setIsRoomsLocked = useCallback((locked: boolean) => {
    setIsRoomsLockedState(locked);
    const scope = user?.id ? user.id : 'guest';
    safeSetLocalStorage(`dutyflow_${scope}_rooms_locked`, locked);
    idbSet(`dutyflow_${scope}_rooms_locked`, locked);
    if (user?.id && isUUID(user.id)) {
      syncUserWorkspaceToDatabase(user.id, { isRoomsLocked: locked }).catch(() => {});
    }
  }, [user?.id]);

  const toggleRoomsLock = useCallback((): boolean => {
    const next = !isRoomsLocked;
    setIsRoomsLocked(next);
    return next;
  }, [isRoomsLocked, setIsRoomsLocked]);

  const getStorageKey = useCallback((key: string) => {
    const scope = user?.id ? user.id : 'guest';
    return `dutyflow_${scope}_seating_${key}`;
  }, [user?.id]);

  // Load user data from localStorage and restore from cloud on login
  useEffect(() => {
    let isMounted = true;
    const currentUserId = user?.id;
    const scope = currentUserId ? currentUserId : 'guest';

    // Proactively purge duplicate guest keys & preview data to prevent quota bloat
    purgeBloatedLocalStorageKeys(currentUserId);

    // If user switched accounts or auth transitioned, lock saving until loaded
    if (prevUserIdRef.current !== currentUserId) {
      setIsLoaded(false);
      isInitialLoadDoneRef.current = false;
      prevUserIdRef.current = currentUserId;
    }

    let finalRooms = DEFAULT_STUDENT_ROOMS;
    let finalSubjects: StudentSubject[] = [];
    let normalizedStudents: Record<string, StudentRecord[]> = {};

    try {
      // 1. Recover rooms
      let loadedRooms: SeatingMasterRoom[] | null = null;
      const storedRooms = localStorage.getItem(`dutyflow_${scope}_seating_rooms`);
      if (storedRooms) {
        try {
          const parsed = JSON.parse(storedRooms);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedRooms = parsed;
          }
        } catch (_) { }
      }

      if (!loadedRooms && scope !== 'guest') {
        const guestRooms = localStorage.getItem('dutyflow_guest_seating_rooms');
        if (guestRooms) {
          try {
            const parsed = JSON.parse(guestRooms);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedRooms = parsed;
              safeSetLocalStorage(`dutyflow_${scope}_seating_rooms`, guestRooms);
            }
          } catch (_) { }
        }
      }

      finalRooms = loadedRooms && loadedRooms.length > 0 ? normalizeRooms(loadedRooms) : DEFAULT_STUDENT_ROOMS;
      if (isMounted) setRooms(finalRooms);

      // 2. Recover subjects across all storage keys
      finalSubjects = recoverAllLocalSubjects(scope);

      // 3. Recover students across all storage keys & normalize
      const rawStudents = recoverAllLocalStudents(scope);
      normalizedStudents = normalizeStudentsBySubject(rawStudents, finalSubjects);

      // Reconcile uploadedStudentsCount on each subject so badges & counts reflect reality
      const reconciledSubjects = finalSubjects.map((s) => {
        const directList = normalizedStudents[s.id] || normalizedStudents[s.name] || [];
        const count = directList.length > 0 ? directList.length : (s.uploadedStudentsCount || 0);
        return { ...s, uploadedStudentsCount: count };
      });

      if (isMounted) {
        setSubjects(reconciledSubjects);
        setStudentsBySubject(normalizedStudents);
      }

      // 4. Recover allocations (fast localStorage check)
      let loadedAllocs: SeatingAllocationRecord[] = [];
      const storedAllocations = localStorage.getItem(getStorageKey('allocations'));
      if (storedAllocations) {
        try {
          const parsed = JSON.parse(storedAllocations);
          if (Array.isArray(parsed)) loadedAllocs = parsed;
        } catch (_) {}
      } else if (scope !== 'guest') {
        const guestAllocs = localStorage.getItem('dutyflow_guest_seating_allocations');
        if (guestAllocs) {
          try {
            const parsed = JSON.parse(guestAllocs);
            if (Array.isArray(parsed)) loadedAllocs = parsed;
          } catch (_) {}
        }
      }
      if (isMounted) setAllocations(loadedAllocs);

      // 5. Asynchronous IndexedDB Recovery (handles allocations larger than localStorage 5MB quota)
      idbGet<SeatingAllocationRecord[]>(`dutyflow_${scope}_seating_allocations`).then((idbAllocs) => {
        if (!isMounted) return;
        if (idbAllocs && Array.isArray(idbAllocs) && idbAllocs.length > 0) {
          setAllocations((prev) => {
            if (!prev || prev.length === 0) return idbAllocs;
            const prevHasPlans = (prev[0]?.roomPlans?.length ?? 0) > 0;
            const idbHasPlans = (idbAllocs[0]?.roomPlans?.length ?? 0) > 0;
            if (!prevHasPlans && idbHasPlans) return idbAllocs;
            if (idbAllocs.length >= prev.length) return idbAllocs;
            return prev;
          });
        }
      }).catch(() => {});

      idbGet<Record<string, StudentRecord[]>>(`dutyflow_${scope}_seating_students`).then((idbStudents) => {
        if (!isMounted) return;
        if (idbStudents && typeof idbStudents === 'object' && Object.keys(idbStudents).length > 0) {
          setStudentsBySubject((prev) => {
            const hasPrev = prev && Object.keys(prev).length > 0;
            if (!hasPrev) return idbStudents;
            return { ...idbStudents, ...prev };
          });
        }
      }).catch(() => {});

      // Persist recovered data safely
      safeSetLocalStorage(`dutyflow_${scope}_seating_rooms`, finalRooms);
      safeSetLocalStorage(`dutyflow_${scope}_seating_subjects`, reconciledSubjects);
      safeSetLocalStorage(`dutyflow_${scope}_seating_students`, normalizedStudents);
      if (scope === 'guest') {
        safeSetLocalStorage('dutyflow_guest_seating_subjects', reconciledSubjects);
        safeSetLocalStorage('dutyflow_guest_seating_students', normalizedStudents);
      }

      idbSet(`dutyflow_${scope}_seating_rooms`, finalRooms);
      idbSet(`dutyflow_${scope}_seating_subjects`, reconciledSubjects);
      idbSet(`dutyflow_${scope}_seating_students`, normalizedStudents);

    } catch (err) {
      console.warn('[DutyFlow Storage] Notice during student seating data load:', err);
    }

    // CENTRAL CLOUD RESTORATION:
    // If user is logged in with valid UUID, restore workspace and seating allocations from Supabase central database
    if (currentUserId && isUUID(currentUserId)) {
      Promise.all([
        fetchUserWorkspaceFromDatabase(currentUserId),
        fetchUserSeatingAllocationsFromDatabase(currentUserId),
        fetchSeatingRoomsFromCloud(currentUserId),
      ]).then(([ws, cloudAllocs, cloudRooms]) => {
        if (!isMounted) return;

        // 1. Restore Rooms (prefer central workspace, fallback to cloudRooms)
        if (ws?.seatingRooms && Array.isArray(ws.seatingRooms) && ws.seatingRooms.length > 0) {
          const normalized = normalizeRooms(ws.seatingRooms);
          setRooms(normalized);
          setIsRoomsCloudSynced(true);
          safeSetLocalStorage(`dutyflow_${currentUserId}_seating_rooms`, normalized);
          idbSet(`dutyflow_${currentUserId}_seating_rooms`, normalized);
        } else if (cloudRooms && Array.isArray(cloudRooms) && cloudRooms.length > 0) {
          const normalized = normalizeRooms(cloudRooms);
          setRooms(normalized);
          setIsRoomsCloudSynced(true);
          safeSetLocalStorage(`dutyflow_${currentUserId}_seating_rooms`, normalized);
          idbSet(`dutyflow_${currentUserId}_seating_rooms`, normalized);
        }

        // 2. Restore Subjects from central database
        let activeSubjects = finalSubjects;
        if (ws?.subjects && Array.isArray(ws.subjects)) {
          const nonSampleCloudSubjects = ws.subjects.filter((s: StudentSubject) => !isLegacySampleSubject(s));
          if (nonSampleCloudSubjects.length > 0) {
            activeSubjects = nonSampleCloudSubjects;
            setSubjects(nonSampleCloudSubjects);
            safeSetLocalStorage(`dutyflow_${currentUserId}_seating_subjects`, nonSampleCloudSubjects);
            idbSet(`dutyflow_${currentUserId}_seating_subjects`, nonSampleCloudSubjects);
          } else {
            activeSubjects = [];
            setSubjects([]);
            safeSetLocalStorage(`dutyflow_${currentUserId}_seating_subjects`, []);
            idbSet(`dutyflow_${currentUserId}_seating_subjects`, []);
            if (ws.subjects.length > 0) {
              // Legacy sample subjects existed in cloud - clean them out of Supabase
              syncUserWorkspaceToDatabase(currentUserId, { subjects: [], studentsBySubject: {} }).catch(() => {});
            }
          }
        }

        // 3. Restore Student Records from central database (filter legacy sample keys)
        if (ws?.studentsBySubject && typeof ws.studentsBySubject === 'object') {
          const cleanedCloudStudents: Record<string, StudentRecord[]> = {};
          for (const [k, v] of Object.entries(ws.studentsBySubject)) {
            if (!LEGACY_SAMPLE_SUBJECT_IDS.has(k) && Array.isArray(v)) {
              cleanedCloudStudents[k] = v;
            }
          }
          if (Object.keys(cleanedCloudStudents).length > 0) {
            setStudentsBySubject((prev) => {
              const merged = { ...prev, ...cleanedCloudStudents };
              const normalized = normalizeStudentsBySubject(merged, activeSubjects);
              safeSetLocalStorage(`dutyflow_${currentUserId}_seating_students`, normalized);
              idbSet(`dutyflow_${currentUserId}_seating_students`, normalized);
              return normalized;
            });
          } else {
            setStudentsBySubject({});
            safeSetLocalStorage(`dutyflow_${currentUserId}_seating_students`, {});
            idbSet(`dutyflow_${currentUserId}_seating_students`, {});
          }
        } else if (Object.keys(normalizedStudents).length > 0) {
          syncUserWorkspaceToDatabase(currentUserId, {
            studentsBySubject: normalizedStudents,
            subjects: activeSubjects,
          }).catch(() => {});
        }

        // 4. Restore Seating Allocations from central database
        if (cloudAllocs && Array.isArray(cloudAllocs) && cloudAllocs.length > 0) {
          setAllocations(cloudAllocs);
          idbSet(`dutyflow_${currentUserId}_seating_allocations`, cloudAllocs);
          safeSetLocalStorage(`dutyflow_${currentUserId}_seating_allocations`, cloudAllocs);

          // Restore active allocation
          if (ws?.activeSeatingAllocationId) {
            const match = cloudAllocs.find((a) => a.id === ws.activeSeatingAllocationId);
            setActiveAllocation(match || cloudAllocs[0] || null);
          } else {
            setActiveAllocation(cloudAllocs[0]);
          }
        }

        setIsCloudSynced(true);
      }).catch((cloudErr) => {
        console.error('Error restoring student seating from central database:', cloudErr);
      }).finally(() => {
        if (isMounted) {
          setIsLoaded(true);
          isInitialLoadDoneRef.current = true;
        }
      });
    } else {
      if (isMounted) {
        setIsLoaded(true);
        isInitialLoadDoneRef.current = true;
      }
    }

    return () => {
      isMounted = false;
    };
  }, [getStorageKey, user?.id]);

  // Window Focus & Visibility Change Cross-Device Auto-Refresh
  useEffect(() => {
    if (!user?.id || !isUUID(user.id)) return;

    const handleRefresh = () => {
      Promise.all([
        fetchUserWorkspaceFromDatabase(user.id),
        fetchUserSeatingAllocationsFromDatabase(user.id),
      ]).then(([ws, cloudAllocs]) => {
        if (ws?.seatingRooms?.length) {
          const normalized = normalizeRooms(ws.seatingRooms);
          setRooms(normalized);
          safeSetLocalStorage(`dutyflow_${user.id}_seating_rooms`, normalized);
          idbSet(`dutyflow_${user.id}_seating_rooms`, normalized);
        }
        if (ws?.subjects && Array.isArray(ws.subjects)) {
          const cleaned = ws.subjects.filter((s: StudentSubject) => !isLegacySampleSubject(s));
          setSubjects(cleaned);
          safeSetLocalStorage(getStorageKey('subjects'), cleaned);
          idbSet(getStorageKey('subjects'), cleaned);
        }
        if (ws?.studentsBySubject && typeof ws.studentsBySubject === 'object') {
          const cleanedStudents: Record<string, StudentRecord[]> = {};
          for (const [k, v] of Object.entries(ws.studentsBySubject)) {
            if (!LEGACY_SAMPLE_SUBJECT_IDS.has(k) && Array.isArray(v)) {
              cleanedStudents[k] = v;
            }
          }
          setStudentsBySubject(cleanedStudents);
          safeSetLocalStorage(getStorageKey('students'), cleanedStudents);
          idbSet(getStorageKey('students'), cleanedStudents);
        }
        if (cloudAllocs && Array.isArray(cloudAllocs)) {
          setAllocations(cloudAllocs);
          idbSet(getStorageKey('allocations'), cloudAllocs);
          safeSetLocalStorage(getStorageKey('allocations'), cloudAllocs);
          if (ws?.activeSeatingAllocationId) {
            const active = cloudAllocs.find((a) => a.id === ws.activeSeatingAllocationId);
            if (active) setActiveAllocation(active);
          }
        }
      }).catch(() => {});
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    };

    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.id, getStorageKey, subjects]);

  // Save changes safely to IndexedDB and localStorage only after initial load is fully verified
  useEffect(() => {
    if (!isLoaded || !isInitialLoadDoneRef.current) return;
    if (prevUserIdRef.current !== user?.id) return;

    try {
      const scope = user?.id ? user.id : 'guest';

      // 1. High-capacity IndexedDB storage (virtually unlimited capacity for heavy allocations & student rosters)
      idbSet(`dutyflow_${scope}_seating_rooms`, rooms);
      idbSet(`dutyflow_${scope}_seating_subjects`, subjects);
      idbSet(`dutyflow_${scope}_seating_students`, studentsBySubject);
      idbSet(`dutyflow_${scope}_seating_allocations`, allocations);

      // 2. Safe localStorage setter (with quota guard & automatic fallback compression)
      safeSetLocalStorage(`dutyflow_${scope}_seating_rooms`, rooms);
      safeSetLocalStorage(`dutyflow_${scope}_seating_subjects`, subjects);
      safeSetLocalStorage(`dutyflow_${scope}_seating_students`, studentsBySubject);
      safeSetLocalStorage(`dutyflow_${scope}_seating_allocations`, allocations);

      // Only write to guest keys if current scope is guest
      if (scope === 'guest') {
        safeSetLocalStorage('dutyflow_guest_seating_rooms', rooms);
        safeSetLocalStorage('dutyflow_guest_seating_subjects', subjects);
        safeSetLocalStorage('dutyflow_guest_seating_students', studentsBySubject);
        safeSetLocalStorage('dutyflow_guest_seating_allocations', allocations);
      }
    } catch (err) {
      console.warn('[DutyFlow Storage] Background sync to storage notice:', err);
    }
  }, [rooms, subjects, studentsBySubject, allocations, isLoaded, user?.id]);

  // Save added rooms explicitly to storage and cloud
  const saveRoomsToStorage = useCallback(async (roomsToSave?: SeatingMasterRoom[]): Promise<boolean> => {
    const dataToSave = roomsToSave || rooms;
    const scope = user?.id ? user.id : 'guest';

    safeSetLocalStorage(`dutyflow_${scope}_seating_rooms`, dataToSave);
    idbSet(`dutyflow_${scope}_seating_rooms`, dataToSave);
    if (scope === 'guest') {
      safeSetLocalStorage('dutyflow_guest_seating_rooms', dataToSave);
    }

    if (user?.id && isUUID(user.id)) {
      try {
        await saveSeatingRoomsToCloud(dataToSave, user.id);
        await syncUserWorkspaceToDatabase(user.id, { seatingRooms: dataToSave });
        setIsRoomsCloudSynced(true);
        return true;
      } catch (cloudErr) {
        console.warn('Cloud sync error for master rooms:', cloudErr);
      }
    }

    return true;
  }, [rooms, user?.id]);

  // Room Management
  const addRoom = useCallback(
    (
      roomNo: string,
      leftBenches: number,
      middleBenchesOrRight: number | undefined,
      rightBenches?: number
    ): SeatingMasterRoom => {
      let middle: number | undefined = undefined;
      let finalRight = 0;

      if (rightBenches === undefined) {
        middle = undefined;
        finalRight = typeof middleBenchesOrRight === 'number' ? middleBenchesOrRight : 0;
      } else {
        middle =
          typeof middleBenchesOrRight === 'number' && middleBenchesOrRight > 0
            ? middleBenchesOrRight
            : undefined;
        finalRight = rightBenches;
      }

      const total = leftBenches + (middle || 0) + finalRight;
      const newRoom: SeatingMasterRoom = {
        id: `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        roomNo: roomNo.trim(),
        leftBenches,
        middleBenches: middle,
        rightBenches: finalRight,
        totalBenches: total,
        capacityOne: total * 1,
        capacityTwo: total * 2,
        capacityThree: total * 3,
        status: 'Available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setRooms((prev) => {
        const updated = [...prev, newRoom];
        const scope = user?.id ? user.id : 'guest';
        safeSetLocalStorage(`dutyflow_${scope}_seating_rooms`, updated);
        idbSet(`dutyflow_${scope}_seating_rooms`, updated);
        if (scope === 'guest') {
          safeSetLocalStorage('dutyflow_guest_seating_rooms', updated);
        }
        if (user?.id && isUUID(user.id)) {
          syncUserWorkspaceToDatabase(user.id, { seatingRooms: updated }).catch(() => {});
          saveSeatingRoomsToCloud(updated, user.id).catch(() => {});
        }
        return updated;
      });
      return newRoom;
    },
    [user?.id]
  );

  const updateRoom = useCallback(
    (
      id: string,
      roomNo: string,
      leftBenches: number,
      middleBenchesOrRight: number | undefined,
      rightBenches?: number
    ) => {
      let middle: number | undefined = undefined;
      let finalRight = 0;

      if (rightBenches === undefined) {
        middle = undefined;
        finalRight = typeof middleBenchesOrRight === 'number' ? middleBenchesOrRight : 0;
      } else {
        middle =
          typeof middleBenchesOrRight === 'number' && middleBenchesOrRight > 0
            ? middleBenchesOrRight
            : undefined;
        finalRight = rightBenches;
      }

      const total = leftBenches + (middle || 0) + finalRight;

      setRooms((prev) => {
        const updated = prev.map((r) =>
          r.id === id
            ? {
                ...r,
                roomNo: roomNo.trim(),
                leftBenches,
                middleBenches: middle,
                rightBenches: finalRight,
                totalBenches: total,
                capacityOne: total * 1,
                capacityTwo: total * 2,
                capacityThree: total * 3,
                updatedAt: new Date().toISOString(),
              }
            : r
        );
        const scope = user?.id ? user.id : 'guest';
        safeSetLocalStorage(`dutyflow_${scope}_seating_rooms`, updated);
        idbSet(`dutyflow_${scope}_seating_rooms`, updated);
        if (scope === 'guest') {
          safeSetLocalStorage('dutyflow_guest_seating_rooms', updated);
        }
        if (user?.id && isUUID(user.id)) {
          syncUserWorkspaceToDatabase(user.id, { seatingRooms: updated }).catch(() => {});
          saveSeatingRoomsToCloud(updated, user.id).catch(() => {});
        }
        return updated;
      });
    },
    [user?.id]
  );

  const isRoomInUse = useCallback((roomId: string): boolean => {
    return allocations.some((alloc) => alloc.roomIds.includes(roomId));
  }, [allocations]);

  const deleteRoom = useCallback((id: string) => {
    const inUse = isRoomInUse(id);
    setRooms((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      const scope = user?.id ? user.id : 'guest';
      safeSetLocalStorage(`dutyflow_${scope}_seating_rooms`, updated);
      idbSet(`dutyflow_${scope}_seating_rooms`, updated);
      if (scope === 'guest') {
        safeSetLocalStorage('dutyflow_guest_seating_rooms', updated);
      }
      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { seatingRooms: updated }).catch(() => {});
        saveSeatingRoomsToCloud(updated, user.id).catch(() => {});
      }
      return updated;
    });
    return { success: true, wasInUse: inUse };
  }, [isRoomInUse, user?.id]);

  const clearRooms = useCallback(() => {
    setRooms([]);
    const scope = user?.id ? user.id : 'guest';
    safeSetLocalStorage(`dutyflow_${scope}_seating_rooms`, []);
    idbSet(`dutyflow_${scope}_seating_rooms`, []);
    if (scope === 'guest') {
      safeSetLocalStorage('dutyflow_guest_seating_rooms', []);
    }
    if (user?.id && isUUID(user.id)) {
      syncUserWorkspaceToDatabase(user.id, { seatingRooms: [] }).catch(() => {});
      saveSeatingRoomsToCloud([], user.id).catch(() => {});
    }
  }, [user?.id]);

  // Subject Management
  const addSubject = useCallback((name: string, code?: string, expectedStudents: number = 0): StudentSubject => {
    const scope = user?.id ? user.id : 'guest';
    const cleanName = name.trim();
    const cleanCode = code ? code.trim() : undefined;

    const newSubj: StudentSubject = {
      id: `subj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      code: cleanCode,
      expectedStudents,
      uploadedStudentsCount: 0,
      createdAt: new Date().toISOString(),
    };

    const updatedSubjs = [...subjects, newSubj];

    // Explicitly retain student count zero for newly added subject and purge stale legacy memory
    const nextStudents: Record<string, StudentRecord[]> = { ...studentsBySubject };
    nextStudents[newSubj.id] = [];
    delete nextStudents[cleanName];
    delete nextStudents[cleanName.toLowerCase()];
    if (cleanCode) {
      delete nextStudents[cleanCode];
      delete nextStudents[cleanCode.toLowerCase()];
    }

    setSubjects(updatedSubjs);
    setStudentsBySubject(nextStudents);

    safeSetLocalStorage(`dutyflow_${scope}_seating_subjects`, updatedSubjs);
    idbSet(`dutyflow_${scope}_seating_subjects`, updatedSubjs);
    safeSetLocalStorage(`dutyflow_${scope}_seating_students`, nextStudents);
    idbSet(`dutyflow_${scope}_seating_students`, nextStudents);

    if (scope === 'guest') {
      safeSetLocalStorage('dutyflow_guest_seating_subjects', updatedSubjs);
      safeSetLocalStorage('dutyflow_guest_seating_students', nextStudents);
    }

    if (user?.id && isUUID(user.id)) {
      syncUserWorkspaceToDatabase(user.id, {
        subjects: updatedSubjs,
        studentsBySubject: nextStudents,
      }).catch(() => {});
    }

    return newSubj;
  }, [subjects, studentsBySubject, user?.id]);

  const updateSubject = useCallback((id: string, data: Partial<StudentSubject>) => {
    const scope = user?.id ? user.id : 'guest';
    setSubjects((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...data } : s));
      safeSetLocalStorage(`dutyflow_${scope}_seating_subjects`, updated);
      idbSet(`dutyflow_${scope}_seating_subjects`, updated);
      if (scope === 'guest') {
        safeSetLocalStorage('dutyflow_guest_seating_subjects', updated);
      }
      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { subjects: updated }).catch(() => {});
      }
      return updated;
    });
  }, [user?.id]);

  const deleteSubject = useCallback((id: string) => {
    const scope = user?.id ? user.id : 'guest';
    const subj = subjects.find((s) => s.id === id);
    const updatedSubjs = subjects.filter((s) => s.id !== id);

    const nextStudents = { ...studentsBySubject };
    delete nextStudents[id];
    if (subj) {
      delete nextStudents[subj.name];
      delete nextStudents[subj.name.toLowerCase()];
      if (subj.code) delete nextStudents[subj.code];
    }

    setSubjects(updatedSubjs);
    setStudentsBySubject(nextStudents);

    safeSetLocalStorage(`dutyflow_${scope}_seating_subjects`, updatedSubjs);
    idbSet(`dutyflow_${scope}_seating_subjects`, updatedSubjs);
    safeSetLocalStorage(`dutyflow_${scope}_seating_students`, nextStudents);
    idbSet(`dutyflow_${scope}_seating_students`, nextStudents);

    if (scope === 'guest') {
      safeSetLocalStorage('dutyflow_guest_seating_subjects', updatedSubjs);
      safeSetLocalStorage('dutyflow_guest_seating_students', nextStudents);
    }

    if (user?.id && isUUID(user.id)) {
      syncUserWorkspaceToDatabase(user.id, {
        subjects: updatedSubjs,
        studentsBySubject: nextStudents,
      }).catch(() => {});
    }
  }, [subjects, studentsBySubject, user?.id]);

  const clearAllSubjects = useCallback(() => {
    const scope = user?.id ? user.id : 'guest';
    setSubjects([]);
    setStudentsBySubject({});

    safeSetLocalStorage(`dutyflow_${scope}_seating_subjects`, []);
    safeSetLocalStorage(`dutyflow_${scope}_seating_students`, {});
    idbSet(`dutyflow_${scope}_seating_subjects`, []);
    idbSet(`dutyflow_${scope}_seating_students`, {});

    if (scope === 'guest') {
      safeSetLocalStorage('dutyflow_guest_seating_subjects', []);
      safeSetLocalStorage('dutyflow_guest_seating_students', {});
    }

    try {
      localStorage.setItem(`dutyflow_${scope}_seating_subjects`, '[]');
      localStorage.setItem(`dutyflow_${scope}_seating_students`, '{}');
      if (scope !== 'guest') {
        localStorage.setItem('dutyflow_guest_seating_subjects', '[]');
        localStorage.setItem('dutyflow_guest_seating_students', '{}');
      }
    } catch (_) {}

    if (user?.id && isUUID(user.id)) {
      syncUserWorkspaceToDatabase(user.id, {
        subjects: [],
        studentsBySubject: {},
      }).catch(() => {});
    }
  }, [user?.id]);

  // Student Data Management
  const saveSubjectStudents = useCallback((subjectId: string, students: StudentRecord[]) => {
    const scope = user?.id ? user.id : 'guest';

    // 1. Update studentsBySubject strictly by subjectId without name aliasing
    const nextStudents: Record<string, StudentRecord[]> = {
      ...studentsBySubject,
      [subjectId]: students,
    };

    setStudentsBySubject(nextStudents);

    safeSetLocalStorage(`dutyflow_${scope}_seating_students`, nextStudents);
    idbSet(`dutyflow_${scope}_seating_students`, nextStudents);
    if (scope === 'guest') {
      safeSetLocalStorage('dutyflow_guest_seating_students', nextStudents);
    }

    // 2. Update subjects state with verified uploadedStudentsCount
    const nextSubjs = subjects.map((s) =>
      s.id === subjectId
        ? { ...s, uploadedStudentsCount: students.length }
        : s
    );

    setSubjects(nextSubjs);

    safeSetLocalStorage(`dutyflow_${scope}_seating_subjects`, nextSubjs);
    idbSet(`dutyflow_${scope}_seating_subjects`, nextSubjs);
    if (scope === 'guest') {
      safeSetLocalStorage('dutyflow_guest_seating_subjects', nextSubjs);
    }

    // Sync atomically to cloud database
    if (user?.id && isUUID(user.id)) {
      syncUserWorkspaceToDatabase(user.id, {
        subjects: nextSubjs,
        studentsBySubject: nextStudents,
      }).catch(() => {});
    }
  }, [subjects, studentsBySubject, user?.id]);

  const getSubjectStudents = useCallback((subjectId: string): StudentRecord[] => {
    if (!subjectId) return [];
    const list = studentsBySubject[subjectId];
    if (Array.isArray(list)) return list;
    return [];
  }, [studentsBySubject]);

  const clearSubjectStudents = useCallback((subjectId: string) => {
    const scope = user?.id ? user.id : 'guest';
    const subj = subjects.find((s) => s.id === subjectId);

    setStudentsBySubject((prevStudents) => {
      const nextStudents = { ...prevStudents };
      delete nextStudents[subjectId];
      if (subj) {
        delete nextStudents[subj.name];
        delete nextStudents[subj.name.toLowerCase()];
      }

      safeSetLocalStorage(`dutyflow_${scope}_seating_students`, nextStudents);
      idbSet(`dutyflow_${scope}_seating_students`, nextStudents);
      if (scope === 'guest') {
        safeSetLocalStorage('dutyflow_guest_seating_students', nextStudents);
      }

      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { studentsBySubject: nextStudents }).catch(() => {});
      }
      return nextStudents;
    });

    setSubjects((prevSubjs) => {
      const nextSubjs = prevSubjs.map((s) =>
        s.id === subjectId ? { ...s, uploadedStudentsCount: 0 } : s
      );

      safeSetLocalStorage(`dutyflow_${scope}_seating_subjects`, nextSubjs);
      idbSet(`dutyflow_${scope}_seating_subjects`, nextSubjs);
      if (scope === 'guest') {
        safeSetLocalStorage('dutyflow_guest_seating_subjects', nextSubjs);
      }

      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { subjects: nextSubjs }).catch(() => {});
      }
      return nextSubjs;
    });
  }, [subjects, user?.id]);

  // Allocation Management
  const handleSetActiveAllocation = useCallback((alloc: SeatingAllocationRecord | null) => {
    setActiveAllocation(alloc);
    if (user?.id && isUUID(user.id)) {
      syncUserWorkspaceToDatabase(user.id, { activeSeatingAllocationId: alloc?.id || null }).catch(() => {});
    }
  }, [user?.id]);

  const saveAllocation = useCallback((allocation: SeatingAllocationRecord) => {
    const scope = user?.id ? user.id : 'guest';

    setAllocations((prev) => {
      const idx = prev.findIndex((a) => a.id === allocation.id);
      let next: SeatingAllocationRecord[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...allocation, updatedAt: new Date().toISOString() };
      } else {
        next = [allocation, ...prev];
      }

      safeSetLocalStorage(`dutyflow_${scope}_seating_allocations`, next);
      idbSet(`dutyflow_${scope}_seating_allocations`, next);
      if (scope === 'guest') {
        safeSetLocalStorage('dutyflow_guest_seating_allocations', next);
      }

      if (user?.id && isUUID(user.id)) {
        syncSeatingAllocationToDatabase(allocation, user.id).catch(() => {});
        syncUserWorkspaceToDatabase(user.id, { activeSeatingAllocationId: allocation.id }).catch(() => {});
      }

      return next;
    });
    setActiveAllocation(allocation);
  }, [user?.id]);

  const deleteAllocation = useCallback((id: string) => {
    const scope = user?.id ? user.id : 'guest';

    setAllocations((prev) => {
      const next = prev.filter((a) => a.id !== id);
      safeSetLocalStorage(`dutyflow_${scope}_seating_allocations`, next);
      idbSet(`dutyflow_${scope}_seating_allocations`, next);
      if (scope === 'guest') {
        safeSetLocalStorage('dutyflow_guest_seating_allocations', next);
      }

      if (user?.id && isUUID(user.id)) {
        deleteSeatingAllocationFromDatabase(id, user.id).catch(() => {});
      }
      return next;
    });
    if (activeAllocation?.id === id) {
      setActiveAllocation(null);
      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { activeSeatingAllocationId: null }).catch(() => {});
      }
    }
  }, [activeAllocation?.id, user?.id]);

  const duplicateAllocation = useCallback((id: string): SeatingAllocationRecord | null => {
    const existing = allocations.find((a) => a.id === id);
    if (!existing) return null;

    const duplicated: SeatingAllocationRecord = {
      ...existing,
      id: `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${existing.name} (Copy)`,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const scope = user?.id ? user.id : 'guest';

    setAllocations((prev) => {
      const next = [duplicated, ...prev];
      safeSetLocalStorage(`dutyflow_${scope}_seating_allocations`, next);
      idbSet(`dutyflow_${scope}_seating_allocations`, next);
      if (scope === 'guest') {
        safeSetLocalStorage('dutyflow_guest_seating_allocations', next);
      }

      if (user?.id && isUUID(user.id)) {
        syncSeatingAllocationToDatabase(duplicated, user.id).catch(() => {});
        syncUserWorkspaceToDatabase(user.id, { activeSeatingAllocationId: duplicated.id }).catch(() => {});
      }
      return next;
    });
    setActiveAllocation(duplicated);
    return duplicated;
  }, [allocations, user?.id]);

  return (
    <StudentSeatingContext.Provider
      value={{
        rooms,
        subjects,
        studentsBySubject,
        allocations,
        activeAllocation,
        setActiveAllocation: handleSetActiveAllocation,
        addRoom,
        updateRoom,
        deleteRoom,
        clearRooms,
        isRoomsLocked,
        setIsRoomsLocked,
        toggleRoomsLock,
        isRoomInUse,
        saveRoomsToStorage,
        isRoomsCloudSynced,
        isCloudSynced,
        addSubject,
        updateSubject,
        deleteSubject,
        clearAllSubjects,
        saveSubjectStudents,
        getSubjectStudents,
        clearSubjectStudents,
        saveAllocation,
        deleteAllocation,
        duplicateAllocation,
      }}
    >
      {children}
    </StudentSeatingContext.Provider>
  );
}

export function useStudentSeating() {
  const context = useContext(StudentSeatingContext);
  if (!context) {
    throw new Error('useStudentSeating must be used within a StudentSeatingProvider');
  }
  return context;
}
