"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  StudentSession,
  StudentExaminationDetail,
  StudentAuthResult,
} from './student-portal-types';
import {
  getStudentSession,
  clearStudentSession,
  authenticateStudent,
  changeStudentPin,
  getStudentExaminations,
} from './student-portal-service';

interface StudentPortalContextType {
  session: StudentSession | null;
  isAuthenticated: boolean;
  examinations: StudentExaminationDetail[];
  isLoading: boolean;
  refreshExaminations: () => void;
  login: (registerNumber: string, pin: string) => Promise<StudentAuthResult>;
  logout: () => void;
  changePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
}

const StudentPortalContext = createContext<StudentPortalContextType | undefined>(undefined);

export function StudentPortalProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<StudentSession | null>(null);
  const [examinations, setExaminations] = useState<StudentExaminationDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from storage
  const syncSessionAndData = useCallback(() => {
    const cur = getStudentSession();
    setSessionState(cur);

    if (cur?.registerNumber) {
      const exams = getStudentExaminations(cur.registerNumber);
      setExaminations(exams);
    } else {
      setExaminations([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    syncSessionAndData();

    // Listen to cross-window and custom storage events
    const handleAuthChange = () => syncSessionAndData();
    window.addEventListener('dutyflow:student-auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('focus', handleAuthChange);

    return () => {
      window.removeEventListener('dutyflow:student-auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('focus', handleAuthChange);
    };
  }, [syncSessionAndData]);

  const login = useCallback(async (registerNumber: string, pin: string): Promise<StudentAuthResult> => {
    setIsLoading(true);
    try {
      const res = await authenticateStudent(registerNumber, pin);
      if (res.success && res.session) {
        setSessionState(res.session);
        const exams = getStudentExaminations(res.session.registerNumber);
        setExaminations(exams);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearStudentSession();
    setSessionState(null);
    setExaminations([]);
  }, []);

  const changePin = useCallback(async (currentPin: string, newPin: string) => {
    if (!session?.registerNumber) {
      return { success: false, error: 'Student not authenticated.' };
    }
    return changeStudentPin(session.registerNumber, currentPin, newPin);
  }, [session?.registerNumber]);

  const refreshExaminations = useCallback(() => {
    if (!session?.registerNumber) return;
    const exams = getStudentExaminations(session.registerNumber);
    setExaminations(exams);
  }, [session?.registerNumber]);

  return (
    <StudentPortalContext.Provider
      value={{
        session,
        isAuthenticated: Boolean(session),
        examinations,
        isLoading,
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
