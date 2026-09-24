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
  addRoom: (roomNo: string, leftBenches: number, rightBenches: number) => SeatingMasterRoom;
  updateRoom: (id: string, roomNo: string, leftBenches: number, rightBenches: number) => void;
  deleteRoom: (id: string) => { success: boolean; wasInUse: boolean };
  isRoomInUse: (roomId: string) => boolean;
  saveRoomsToStorage: (roomsToSave?: SeatingMasterRoom[]) => Promise<boolean>;

  // Subject Management
  addSubject: (name: string, code?: string, expectedStudents?: number) => StudentSubject;
  updateSubject: (id: string, data: Partial<StudentSubject>) => void;
  deleteSubject: (id: string) => void;

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

export function StudentSeatingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<SeatingMasterRoom[]>(DEFAULT_STUDENT_ROOMS);
  const [subjects, setSubjects] = useState<StudentSubject[]>(DEFAULT_STUDENT_SUBJECTS);
  const [studentsBySubject, setStudentsBySubject] = useState<Record<string, StudentRecord[]>>({});
  const [allocations, setAllocations] = useState<SeatingAllocationRecord[]>([]);
  const [activeAllocation, setActiveAllocation] = useState<SeatingAllocationRecord | null>(null);
  const [isRoomsCloudSynced, setIsRoomsCloudSynced] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const getStorageKey = useCallback((key: string) => {
    const scope = user?.id ? user.id : 'guest';
    return `dutyflow_${scope}_seating_${key}`;
  }, [user?.id]);

  // Load user data from localStorage and restore from cloud on login
  useEffect(() => {
    let isMounted = true;
    const currentUserId = user?.id;
    const scope = currentUserId ? currentUserId : 'guest';

    try {
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

      // If user is logged in and no user-specific rooms exist yet, check guest rooms for migration!
      if (!loadedRooms && scope !== 'guest') {
        const guestRooms = localStorage.getItem('dutyflow_guest_seating_rooms');
        if (guestRooms) {
          try {
            const parsed = JSON.parse(guestRooms);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedRooms = parsed;
              localStorage.setItem(`dutyflow_${scope}_seating_rooms`, guestRooms);
            }
          } catch (_) { }
        }
      }

      if (loadedRooms && isMounted) {
        setRooms(loadedRooms);
      } else if (!loadedRooms && isMounted) {
        setRooms(DEFAULT_STUDENT_ROOMS);
      }

      const storedSubjects = localStorage.getItem(getStorageKey('subjects'));
      if (storedSubjects) {
        setSubjects(JSON.parse(storedSubjects));
      } else {
        setSubjects(DEFAULT_STUDENT_SUBJECTS);
      }

      const storedStudents = localStorage.getItem(getStorageKey('students'));
      if (storedStudents) {
        setStudentsBySubject(JSON.parse(storedStudents));
      } else {
        setStudentsBySubject({});
      }

      const storedAllocations = localStorage.getItem(getStorageKey('allocations'));
      if (storedAllocations) {
        setAllocations(JSON.parse(storedAllocations));
      } else {
        setAllocations([]);
      }
    } catch (err) {
      console.error('Error loading student seating data:', err);
    } finally {
      if (isMounted) setIsLoaded(true);
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
          setRooms(ws.seatingRooms);
          setIsRoomsCloudSynced(true);
          try {
            localStorage.setItem(`dutyflow_${currentUserId}_seating_rooms`, JSON.stringify(ws.seatingRooms));
          } catch (_) { }
        } else if (cloudRooms && Array.isArray(cloudRooms) && cloudRooms.length > 0) {
          setRooms(cloudRooms);
          setIsRoomsCloudSynced(true);
          try {
            localStorage.setItem(`dutyflow_${currentUserId}_seating_rooms`, JSON.stringify(cloudRooms));
          } catch (_) { }
        }

        // 2. Restore Subjects from central database
        if (ws?.subjects && Array.isArray(ws.subjects) && ws.subjects.length > 0) {
          setSubjects(ws.subjects);
          try {
            localStorage.setItem(`dutyflow_${currentUserId}_seating_subjects`, JSON.stringify(ws.subjects));
          } catch (_) { }
        }

        // 3. Restore Student Records from central database
        if (ws?.studentsBySubject && typeof ws.studentsBySubject === 'object' && Object.keys(ws.studentsBySubject).length > 0) {
          setStudentsBySubject(ws.studentsBySubject);
          try {
            localStorage.setItem(`dutyflow_${currentUserId}_seating_students`, JSON.stringify(ws.studentsBySubject));
          } catch (_) { }
        }

        // 4. Restore Seating Allocations from central database
        if (cloudAllocs && Array.isArray(cloudAllocs) && cloudAllocs.length > 0) {
          setAllocations(cloudAllocs);
          try {
            localStorage.setItem(`dutyflow_${currentUserId}_seating_allocations`, JSON.stringify(cloudAllocs));
          } catch (_) { }

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
      });
    }

    return () => {
      isMounted = false;
    };
  }, [getStorageKey, user?.id]);

  // Window Focus Cross-Device Auto-Refresh
  useEffect(() => {
    if (!user?.id || !isUUID(user.id)) return;

    const handleWindowFocus = () => {
      Promise.all([
        fetchUserWorkspaceFromDatabase(user.id),
        fetchUserSeatingAllocationsFromDatabase(user.id),
      ]).then(([ws, cloudAllocs]) => {
        if (ws?.seatingRooms?.length) setRooms(ws.seatingRooms);
        if (ws?.subjects?.length) setSubjects(ws.subjects);
        if (ws?.studentsBySubject && Object.keys(ws.studentsBySubject).length) {
          setStudentsBySubject(ws.studentsBySubject);
        }
        if (cloudAllocs && Array.isArray(cloudAllocs)) {
          setAllocations(cloudAllocs);
          if (ws?.activeSeatingAllocationId) {
            const active = cloudAllocs.find((a) => a.id === ws.activeSeatingAllocationId);
            if (active) setActiveAllocation(active);
          }
        }
      }).catch(() => {});
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [user?.id]);

  // Save changes to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(getStorageKey('rooms'), JSON.stringify(rooms));
      localStorage.setItem(getStorageKey('subjects'), JSON.stringify(subjects));
      localStorage.setItem(getStorageKey('students'), JSON.stringify(studentsBySubject));
      localStorage.setItem(getStorageKey('allocations'), JSON.stringify(allocations));
    } catch (err) {
      console.error('Error saving student seating data to storage:', err);
    }
  }, [rooms, subjects, studentsBySubject, allocations, isLoaded, getStorageKey]);

  // Save added rooms explicitly to storage and cloud
  const saveRoomsToStorage = useCallback(async (roomsToSave?: SeatingMasterRoom[]): Promise<boolean> => {
    const dataToSave = roomsToSave || rooms;
    const scope = user?.id ? user.id : 'guest';

    try {
      localStorage.setItem(`dutyflow_${scope}_seating_rooms`, JSON.stringify(dataToSave));
      if (scope !== 'guest') {
        localStorage.setItem('dutyflow_guest_seating_rooms', JSON.stringify(dataToSave));
      }
    } catch (e) {
      console.error('Error saving rooms to localStorage:', e);
      return false;
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
  const addRoom = useCallback((roomNo: string, leftBenches: number, rightBenches: number): SeatingMasterRoom => {
    const total = leftBenches + rightBenches;
    const newRoom: SeatingMasterRoom = {
      id: `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      roomNo: roomNo.trim(),
      leftBenches,
      rightBenches,
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
      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { seatingRooms: updated }).catch(() => {});
        saveSeatingRoomsToCloud(updated, user.id).catch(() => {});
      }
      return updated;
    });
    return newRoom;
  }, [user?.id]);

  const updateRoom = useCallback((id: string, roomNo: string, leftBenches: number, rightBenches: number) => {
    const total = leftBenches + rightBenches;
    setRooms((prev) => {
      const updated = prev.map((r) =>
        r.id === id
          ? {
            ...r,
            roomNo: roomNo.trim(),
            leftBenches,
            rightBenches,
            totalBenches: total,
            capacityOne: total * 1,
            capacityTwo: total * 2,
            capacityThree: total * 3,
            updatedAt: new Date().toISOString(),
          }
          : r
      );
      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { seatingRooms: updated }).catch(() => {});
        saveSeatingRoomsToCloud(updated, user.id).catch(() => {});
      }
      return updated;
    });
  }, [user?.id]);

  const isRoomInUse = useCallback((roomId: string): boolean => {
    return allocations.some((alloc) => alloc.roomIds.includes(roomId));
  }, [allocations]);

  const deleteRoom = useCallback((id: string) => {
    const inUse = isRoomInUse(id);
    setRooms((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { seatingRooms: updated }).catch(() => {});
        saveSeatingRoomsToCloud(updated, user.id).catch(() => {});
      }
      return updated;
    });
    return { success: true, wasInUse: inUse };
  }, [isRoomInUse, user?.id]);

  // Subject Management
  const addSubject = useCallback((name: string, code?: string, expectedStudents: number = 0): StudentSubject => {
    const newSubj: StudentSubject = {
      id: `subj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      code: code ? code.trim() : undefined,
      expectedStudents,
      uploadedStudentsCount: 0,
      createdAt: new Date().toISOString(),
    };

    setSubjects((prev) => {
      const updated = [...prev, newSubj];
      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { subjects: updated }).catch(() => {});
      }
      return updated;
    });
    return newSubj;
  }, [user?.id]);

  const updateSubject = useCallback((id: string, data: Partial<StudentSubject>) => {
    setSubjects((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...data } : s));
      if (user?.id && isUUID(user.id)) {
        syncUserWorkspaceToDatabase(user.id, { subjects: updated }).catch(() => {});
      }
      return updated;
    });
  }, [user?.id]);

  const deleteSubject = useCallback((id: string) => {
    setSubjects((prev) => {
      const updatedSubjs = prev.filter((s) => s.id !== id);
      setStudentsBySubject((prevStudents) => {
        const nextStudents = { ...prevStudents };
        delete nextStudents[id];
        if (user?.id && isUUID(user.id)) {
          syncUserWorkspaceToDatabase(user.id, {
            subjects: updatedSubjs,
            studentsBySubject: nextStudents,
          }).catch(() => {});
        }
        return nextStudents;
      });
      return updatedSubjs;
    });
  }, [user?.id]);

  // Student Data Management
  const saveSubjectStudents = useCallback((subjectId: string, students: StudentRecord[]) => {
    setStudentsBySubject((prevStudents) => {
      const nextStudents = {
        ...prevStudents,
        [subjectId]: students,
      };

      setSubjects((prevSubjs) => {
        const nextSubjs = prevSubjs.map((s) =>
          s.id === subjectId
            ? { ...s, uploadedStudentsCount: students.length }
            : s
        );

        if (user?.id && isUUID(user.id)) {
          syncUserWorkspaceToDatabase(user.id, {
            studentsBySubject: nextStudents,
            subjects: nextSubjs,
          }).catch(() => {});
        }

        return nextSubjs;
      });

      return nextStudents;
    });
  }, [user?.id]);

  const getSubjectStudents = useCallback((subjectId: string): StudentRecord[] => {
    return studentsBySubject[subjectId] || [];
  }, [studentsBySubject]);

  const clearSubjectStudents = useCallback((subjectId: string) => {
    setStudentsBySubject((prevStudents) => {
      const nextStudents = { ...prevStudents };
      delete nextStudents[subjectId];

      setSubjects((prevSubjs) => {
        const nextSubjs = prevSubjs.map((s) =>
          s.id === subjectId
            ? { ...s, uploadedStudentsCount: 0 }
            : s
        );

        if (user?.id && isUUID(user.id)) {
          syncUserWorkspaceToDatabase(user.id, {
            studentsBySubject: nextStudents,
            subjects: nextSubjs,
          }).catch(() => {});
        }

        return nextSubjs;
      });

      return nextStudents;
    });
  }, [user?.id]);

  // Allocation Management
  const handleSetActiveAllocation = useCallback((alloc: SeatingAllocationRecord | null) => {
    setActiveAllocation(alloc);
    if (user?.id && isUUID(user.id)) {
      syncUserWorkspaceToDatabase(user.id, { activeSeatingAllocationId: alloc?.id || null }).catch(() => {});
    }
  }, [user?.id]);

  const saveAllocation = useCallback((allocation: SeatingAllocationRecord) => {
    setAllocations((prev) => {
      const idx = prev.findIndex((a) => a.id === allocation.id);
      let next: SeatingAllocationRecord[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...allocation, updatedAt: new Date().toISOString() };
      } else {
        next = [allocation, ...prev];
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
    setAllocations((prev) => {
      const next = prev.filter((a) => a.id !== id);
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

    setAllocations((prev) => {
      const next = [duplicated, ...prev];
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
        isRoomInUse,
        saveRoomsToStorage,
        isRoomsCloudSynced,
        isCloudSynced,
        addSubject,
        updateSubject,
        deleteSubject,
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
