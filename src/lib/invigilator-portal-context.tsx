"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  InvigilatorSession,
  InvigilatorDuty,
  InvigilatorAuthResult,
} from './invigilator-portal-types';
import {
  getInvigilatorSession,
  clearInvigilatorSession,
  authenticateInvigilator,
  changeInvigilatorPin,
  getInvigilatorDuties,
} from './invigilator-portal-service';

interface InvigilatorPortalContextType {
  session: InvigilatorSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  duties: InvigilatorDuty[];
  todayDuties: InvigilatorDuty[];
  historyDuties: InvigilatorDuty[];
  activeDuty: InvigilatorDuty | null;
  setActiveDuty: (duty: InvigilatorDuty | null) => void;
  isOnline: boolean;
  refreshDuties: () => void;
  login: (identifier: string, pin: string) => Promise<InvigilatorAuthResult>;
  logout: () => void;
  changePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
}

const InvigilatorPortalContext = createContext<InvigilatorPortalContextType | undefined>(undefined);

export function InvigilatorPortalProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<InvigilatorSession | null>(null);
  const [duties, setDuties] = useState<InvigilatorDuty[]>([]);
  const [activeDuty, setActiveDuty] = useState<InvigilatorDuty | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Monitor network connectivity for examination hall robustness
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync session and duty records
  const syncSessionAndData = useCallback(() => {
    const cur = getInvigilatorSession();
    setSessionState(cur);

    if (cur?.invigilatorId) {
      const allDuties = getInvigilatorDuties(cur.invigilatorId, cur.name);
      setDuties(allDuties);
      // Auto-set active duty if none chosen and today's duties exist
      setActiveDuty((prev) => {
        if (prev) {
          const updated = allDuties.find((d) => d.dutyId === prev.dutyId);
          return updated || prev;
        }
        const todayPending = allDuties.find((d) => d.isToday && !d.attendanceSubmitted);
        return todayPending || allDuties[0] || null;
      });
    } else {
      setDuties([]);
      setActiveDuty(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    syncSessionAndData();

    const handleAuthChange = () => syncSessionAndData();
    const handleAttendanceChange = () => {
      if (session?.invigilatorId) {
        const updated = getInvigilatorDuties(session.invigilatorId, session.name);
        setDuties(updated);
      }
    };

    window.addEventListener('dutyflow:invigilator-auth-change', handleAuthChange);
    window.addEventListener('dutyflow:attendance-updated', handleAttendanceChange);

    return () => {
      window.removeEventListener('dutyflow:invigilator-auth-change', handleAuthChange);
      window.removeEventListener('dutyflow:attendance-updated', handleAttendanceChange);
    };
  }, [syncSessionAndData, session?.invigilatorId, session?.name]);

  const login = useCallback(async (identifier: string, pin: string) => {
    const res = await authenticateInvigilator(identifier, pin);
    if (res.success && res.session) {
      setSessionState(res.session);
      const allDuties = getInvigilatorDuties(res.session.invigilatorId, res.session.name);
      setDuties(allDuties);
      const todayPending = allDuties.find((d) => d.isToday && !d.attendanceSubmitted);
      setActiveDuty(todayPending || allDuties[0] || null);
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    clearInvigilatorSession();
    setSessionState(null);
    setDuties([]);
    setActiveDuty(null);
  }, []);

  const changePin = useCallback(async (currentPin: string, newPin: string) => {
    if (!session?.invigilatorId) {
      return { success: false, error: 'Invigilator not logged in.' };
    }
    return changeInvigilatorPin(session.invigilatorId, currentPin, newPin);
  }, [session?.invigilatorId]);

  const refreshDuties = useCallback(() => {
    if (!session?.invigilatorId) return;
    const allDuties = getInvigilatorDuties(session.invigilatorId, session.name);
    setDuties(allDuties);
  }, [session?.invigilatorId, session?.name]);

  const todayDuties = duties.filter((d) => d.isToday);
  const historyDuties = duties.filter((d) => d.isPast || d.attendanceSubmitted);

  return (
    <InvigilatorPortalContext.Provider
      value={{
        session,
        isAuthenticated: Boolean(session),
        isLoading,
        duties,
        todayDuties,
        historyDuties,
        activeDuty,
        setActiveDuty,
        isOnline,
        refreshDuties,
        login,
        logout,
        changePin,
      }}
    >
      {children}
    </InvigilatorPortalContext.Provider>
  );
}

export function useInvigilatorPortal() {
  const context = useContext(InvigilatorPortalContext);
  if (!context) {
    throw new Error('useInvigilatorPortal must be used within an InvigilatorPortalProvider');
  }
  return context;
}
