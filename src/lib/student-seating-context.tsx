"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './auth-context';
import {
  SeatingMasterRoom,
  StudentSubject,
  StudentRecord,
  SeatingAllocationRecord,
} from './student-seating-types';
import {
  DEFAULT_STUDENT_ROOMS,
  DEFAULT_STUDENT_SUBJECTS,
} from './student-seating-service';

interface StudentSeatingContextType {
  rooms: SeatingMasterRoom[];
  subjects: StudentSubject[];
  studentsBySubject: Record<string, StudentRecord[]>;
  allocations: SeatingAllocationRecord[];
  activeAllocation: SeatingAllocationRecord | null;
  setActiveAllocation: (alloc: SeatingAllocationRecord | null) => void;

  // Room Management
  addRoom: (roomNo: string, leftBenches: number, rightBenches: number) => SeatingMasterRoom;
  updateRoom: (id: string, roomNo: string, leftBenches: number, rightBenches: number) => void;
  deleteRoom: (id: string) => { success: boolean; wasInUse?: boolean };
  isRoomInUse: (roomId: string) => boolean;

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
  const [isLoaded, setIsLoaded] = useState(false);

  const getStorageKey = useCallback((key: string) => {
    const scope = user?.id ? user.id : 'guest';
    return `dutyflow_${scope}_seating_${key}`;
  }, [user?.id]);

  // Load user data from localStorage
  useEffect(() => {
    try {
      const storedRooms = localStorage.getItem(getStorageKey('rooms'));
      if (storedRooms) {
        setRooms(JSON.parse(storedRooms));
      } else {
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
      setIsLoaded(true);
    }
  }, [getStorageKey]);

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

    setRooms((prev) => [...prev, newRoom]);
    return newRoom;
  }, []);

  const updateRoom = useCallback((id: string, roomNo: string, leftBenches: number, rightBenches: number) => {
    const total = leftBenches + rightBenches;
    setRooms((prev) =>
      prev.map((r) =>
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
      )
    );
  }, []);

  const isRoomInUse = useCallback((roomId: string): boolean => {
    return allocations.some((alloc) => alloc.roomIds.includes(roomId));
  }, [allocations]);

  const deleteRoom = useCallback((id: string) => {
    const inUse = isRoomInUse(id);
    setRooms((prev) => prev.filter((r) => r.id !== id));
    return { success: true, wasInUse: inUse };
  }, [isRoomInUse]);

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

    setSubjects((prev) => [...prev, newSubj]);
    return newSubj;
  }, []);

  const updateSubject = useCallback((id: string, data: Partial<StudentSubject>) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data } : s))
    );
  }, []);

  const deleteSubject = useCallback((id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setStudentsBySubject((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // Student Data Management
  const saveSubjectStudents = useCallback((subjectId: string, students: StudentRecord[]) => {
    setStudentsBySubject((prev) => ({
      ...prev,
      [subjectId]: students,
    }));

    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? { ...s, uploadedStudentsCount: students.length }
          : s
      )
    );
  }, []);

  const getSubjectStudents = useCallback((subjectId: string): StudentRecord[] => {
    return studentsBySubject[subjectId] || [];
  }, [studentsBySubject]);

  const clearSubjectStudents = useCallback((subjectId: string) => {
    setStudentsBySubject((prev) => {
      const next = { ...prev };
      delete next[subjectId];
      return next;
    });

    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? { ...s, uploadedStudentsCount: 0 }
          : s
      )
    );
  }, []);

  // Allocation Management
  const saveAllocation = useCallback((allocation: SeatingAllocationRecord) => {
    setAllocations((prev) => {
      const idx = prev.findIndex((a) => a.id === allocation.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...allocation, updatedAt: new Date().toISOString() };
        return next;
      }
      return [allocation, ...prev];
    });
    setActiveAllocation(allocation);
  }, []);

  const deleteAllocation = useCallback((id: string) => {
    setAllocations((prev) => prev.filter((a) => a.id !== id));
    if (activeAllocation?.id === id) {
      setActiveAllocation(null);
    }
  }, [activeAllocation]);

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

    setAllocations((prev) => [duplicated, ...prev]);
    return duplicated;
  }, [allocations]);

  return (
    <StudentSeatingContext.Provider
      value={{
        rooms,
        subjects,
        studentsBySubject,
        allocations,
        activeAllocation,
        setActiveAllocation,
        addRoom,
        updateRoom,
        deleteRoom,
        isRoomInUse,
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
