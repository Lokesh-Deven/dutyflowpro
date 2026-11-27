"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  StudentSession,
  StudentExaminationDetail,
  StudentAuthResult,
} from './student-portal-types';
import {
  getStudentSession,
  setStudentSession,
  clearStudentSession,
  authenticateStudent,
  changeStudentPin,
  getStudentExaminations,
  syncStudentPortalFromCloud,
} from './student-portal-service';
import { supabase } from './supabase';

interface StudentPortalContextType {
  session: StudentSession | null;
  isAuthenticated: boolean;
  examinations: StudentExaminationDetail[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  refreshExaminations: () => Promise<void>;
  login: (institutionCode: string, registerNumber: string, pin: string) => Promise<StudentAuthResult>;
  logout: () => void;
  changePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
}

const StudentPortalContext = createContext<StudentPortalContextType | undefined>(undefined);

export function StudentPortalProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<StudentSession | null>(null);
  const [examinations, setExaminations] = useState<StudentExaminationDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const sessionRef = useRef<StudentSession | null>(null);
  const examinationsRef = useRef<StudentExaminationDetail[]>([]);

  // Keep sessionRef and examinationsRef in sync for event listeners and async calls
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    examinationsRef.current = examinations;
  }, [examinations]);

  // Synchronizes student data with cloud server
  const syncWithCloud = useCallback(async (activeSession: StudentSession | null) => {
    if (!activeSession?.registerNumber || !activeSession?.institutionCode) return;
    setIsSyncing(true);

    try {
      const res = await syncStudentPortalFromCloud(
        activeSession.institutionCode,
        activeSession.institutionId,
        activeSession.registerNumber
      );

      if (res.success) {
        // PREVENT STATE OVERWRITE:
        // Only update examinations if cloud response has confirmed examination data!
        // Never overwrite existing published examinations with an empty array [].
        if (Array.isArray(res.examinations) && res.examinations.length > 0) {
          setExaminations(res.examinations);
          setLastSyncedAt(new Date().toISOString());
        } else {
          // If cloud sync returned empty, check if local storage has valid published examinations
          const localExams = getStudentExaminations(
            activeSession.registerNumber,
            activeSession.institutionId
          );
          if (localExams && localExams.length > 0) {
            setExaminations(localExams);
          }
          // If current state already has examinations, preserve them stably!
        }

        // Reconcile student profile updates if changed in admin roster
        if (res.student && (res.student.name !== activeSession.studentName || res.student.section !== activeSession.section)) {
          const updatedSession: StudentSession = {
            ...activeSession,
            studentName: res.student.name,
            section: res.student.section || activeSession.section,
            courseStream: res.subject?.code || res.subject?.name || activeSession.courseStream,
          };
          setSessionState(updatedSession);
          setStudentSession(updatedSession);
        }
      }
    } catch (err) {
      console.warn('Background sync warning:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initial load: fast render from storage, then immediate cloud background sync
  const syncSessionAndData = useCallback(() => {
    const cur = getStudentSession();
    setSessionState(cur);

    if (cur?.registerNumber && cur?.institutionId) {
      // 1. Instant local render
      const localExams = getStudentExaminations(cur.registerNumber, cur.institutionId);
      if (localExams && localExams.length > 0) {
        setExaminations(localExams);
      }
      setIsLoading(false);

      // 2. Realtime cloud sync (will not wipe out localExams if cloud is empty)
      syncWithCloud(cur);
    } else {
      setExaminations([]);
      setIsLoading(false);
    }
  }, [syncWithCloud]);

  useEffect(() => {
    syncSessionAndData();

    // Re-sync on focus, tab visibility return, online reconnect
    const handleAuthChange = () => syncSessionAndData();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sessionRef.current) {
        syncWithCloud(sessionRef.current);
      }
    };
    const handleFocus = () => {
      if (sessionRef.current) {
        syncWithCloud(sessionRef.current);
      }
    };
    const handleOnline = () => {
      if (sessionRef.current) {
        syncWithCloud(sessionRef.current);
      }
    };

    window.addEventListener('dutyflow:student-auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('dutyflow:student-auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [syncSessionAndData, syncWithCloud]);

  // Supabase Realtime synchronization listener
  useEffect(() => {
    if (!session?.institutionId) return;

    const channel = supabase
      .channel(`student_sync_${session.institutionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'examination_calendar',
        },
        () => {
          if (sessionRef.current) syncWithCloud(sessionRef.current);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_allotments',
        },
        () => {
          if (sessionRef.current) syncWithCloud(sessionRef.current);
        }
      )
      .subscribe();

    const handleSeatingPublishedChange = () => {
      if (sessionRef.current) {
        if (typeof window !== 'undefined') {
          const cleanRoll = sessionRef.current.registerNumber.trim().toUpperCase();
          localStorage.removeItem(`dutyflow_${sessionRef.current.institutionId}_student_exams_${cleanRoll}`);
        }
        const updated = getStudentExaminations(sessionRef.current.registerNumber, sessionRef.current.institutionId);
        setExaminations(updated);
        syncWithCloud(sessionRef.current);
      }
    };
    window.addEventListener('dutyflow:seating-published-change', handleSeatingPublishedChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('dutyflow:seating-published-change', handleSeatingPublishedChange);
    };
  }, [session?.institutionId, syncWithCloud]);

  const login = useCallback(async (institutionCode: string, registerNumber: string, pin: string): Promise<StudentAuthResult> => {
    setIsLoading(true);
    try {
      const res = await authenticateStudent(institutionCode, registerNumber, pin);
      if (res.success && res.session) {
        setSessionState(res.session);
        // Load initial examinations immediately from local storage if available
        const exams = getStudentExaminations(res.session.registerNumber, res.session.institutionId);
        if (exams && exams.length > 0) {
          setExaminations(exams);
        }
        // Launch live sync
        syncWithCloud(res.session);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  }, [syncWithCloud]);

  const logout = useCallback(() => {
    clearStudentSession();
    setSessionState(null);
    setExaminations([]);
  }, []);

  const changePin = useCallback(async (currentPin: string, newPin: string) => {
    if (!session?.registerNumber) {
      return { success: false, error: 'Student not authenticated.' };
    }
    return changeStudentPin(session.registerNumber, currentPin, newPin, session.institutionCode);
  }, [session?.registerNumber, session?.institutionCode]);

  const refreshExaminations = useCallback(async () => {
    if (session) {
      const localExams = getStudentExaminations(session.registerNumber, session.institutionId);
      if (localExams && localExams.length > 0) {
        setExaminations(localExams);
      }
      await syncWithCloud(session);
    }
  }, [session, syncWithCloud]);

  return (
    <StudentPortalContext.Provider
      value={{
        session,
        isAuthenticated: Boolean(session),
        examinations,
        isLoading,
        isSyncing,
        lastSyncedAt,
        refreshExaminations,
        login,
        logout,
        changePin,
      }}
    >
      {children}
    </StudentPortalContext.Provider>
  );
}

export function useStudentPortal() {
  const context = useContext(StudentPortalContext);
  if (!context) {
    throw new Error('useStudentPortal must be used within a StudentPortalProvider');
  }
  return context;
}
