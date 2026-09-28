"use client";

import React, { useState, useMemo } from 'react';
import { useInvigilatorPortal } from '@/lib/invigilator-portal-context';
import { InvigilatorHeader } from './invigilator-header';
import { TodayDutiesView } from './today-duties-view';
import { RoomAttendanceSheet } from './room-attendance-sheet';
import { DutiesHistoryView } from './duties-history-view';
import { InvigilatorProfileView } from './invigilator-profile-view';
import { InvigilatorDuty } from '@/lib/invigilator-portal-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays,
  UserCheck,
  History,
  User,
  Clock,
  DoorOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
} from 'lucide-react';

export function InvigilatorDashboardView() {
  const { session, todayDuties, historyDuties, activeDuty, setActiveDuty } = useInvigilatorPortal();

  // Navigation tab: 'today' | 'attendance' | 'history' | 'profile'
  const [activeTab, setActiveTab] = useState<'today' | 'attendance' | 'history' | 'profile'>('today');

  // Time-aware greeting: Good Morning / Good Afternoon / Good Evening
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Today's primary examination duty for the top highlight card
  const primaryDuty = useMemo(() => {
    if (todayDuties.length === 0) return null;
    // Prefer pending duty first
    const pending = todayDuties.find((d) => !d.attendanceSubmitted);
    return pending || todayDuties[0];
  }, [todayDuties]);

  // Handlers for switching views
  const handleSelectDutyForAttendance = (duty: InvigilatorDuty) => {
    setActiveDuty(duty);
    setActiveTab('attendance');
  };

  const handleOpenActiveAttendance = () => {
    if (primaryDuty) {
      setActiveDuty(primaryDuty);
      setActiveTab('attendance');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Header Bar */}
      <InvigilatorHeader
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Top Greeting & Title (Requirement 2 & 24) */}
        <div>
          <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-0.5">
            Invigilator Dashboard
          </div>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
            {greeting}, {session?.name || 'Invigilator'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Review your hall duties, mark student attendance, and track examination sessions.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* TODAY'S EXAMINATION HIGHLIGHT CARD (Requirement 2 & 24) */}
        {/* ========================================================================= */}
        {primaryDuty ? (
          <div className="bg-gradient-to-br from-[#1E2A5E] via-[#1A2552] to-[#0F172A] rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-lg border border-white/10 relative overflow-hidden">
            {/* Ambient Background glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs bg-indigo-400/20 text-indigo-200 border border-indigo-400/30 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Today&apos;s Examination
                </span>

                {primaryDuty.attendanceSubmitted ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-bold gap-1.5 py-1 px-3">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Attendance Submitted
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-xs font-bold gap-1.5 py-1 px-3 animate-pulse">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Attendance Pending
                  </Badge>
                )}
              </div>

              {/* Big Subject & Timings */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
                <div>
                  <h2 className="font-headline font-black text-3xl sm:text-4xl text-white tracking-tight">
                    {primaryDuty.subjectName}
                  </h2>
                  <p className="text-xs sm:text-sm text-indigo-200 mt-1 font-medium">
                    {primaryDuty.examName} • {primaryDuty.formattedDate}
                  </p>
                </div>

                <Button
                  onClick={handleOpenActiveAttendance}
                  className="bg-white hover:bg-slate-100 text-[#1E2A5E] font-bold text-xs sm:text-sm h-11 px-5 rounded-xl shadow-md transition-all shrink-0 gap-2"
                >
                  <DoorOpen className="w-4 h-4 text-[#1E2A5E]" />
                  <span>{primaryDuty.attendanceSubmitted ? 'View Room Attendance' : 'Take Attendance Now'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {/* 4 Prominent Stat Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 pt-4 border-t border-white/10">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">
                    Session Time
                  </div>
                  <div className="font-bold text-sm sm:text-base text-white mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                    <span>{primaryDuty.sessionTime}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">
                    Assigned Room
                  </div>
                  <div className="font-black text-base sm:text-lg text-white mt-0.5 flex items-center gap-1.5">
                    <DoorOpen className="w-4 h-4 text-indigo-300 shrink-0" />
                    <span>Room {primaryDuty.roomNo}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">
                    Candidates Count
                  </div>
                  <div className="font-black text-base sm:text-lg text-emerald-300 mt-0.5 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>{primaryDuty.totalStudents} Students</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">
                    Invigilator
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-white mt-0.5 truncate">
                    {primaryDuty.invigilatorName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs text-center">
            <h3 className="font-headline font-bold text-slate-800 text-lg">No Examination Duty For Today</h3>
            <p className="text-xs text-slate-500 mt-1">Review your duties history or check upcoming schedules below.</p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4 PROMINENT DASHBOARD BUTTONS / NAVIGATION CARDS (Requirement 3 & 24) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Today's Duties */}
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              activeTab === 'today'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs hover:border-indigo-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${
              activeTab === 'today' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
            }`}>
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className={`font-headline font-black text-sm sm:text-base leading-snug ${
              activeTab === 'today' ? 'text-white' : 'text-slate-900'
            }`}>
              1. Today&apos;s Duties
            </div>
            <div className={`text-[11px] mt-0.5 ${
              activeTab === 'today' ? 'text-indigo-100' : 'text-slate-500'
            }`}>
              {todayDuties.length} session{todayDuties.length > 1 ? 's' : ''} assigned
            </div>
          </button>

          {/* 2. Room Attendance */}
          <button
            type="button"
            onClick={() => {
              if (primaryDuty && !activeDuty) {
                setActiveDuty(primaryDuty);
              }
              setActiveTab('attendance');
            }}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              activeTab === 'attendance'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs hover:border-indigo-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${
              activeTab === 'attendance' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
            }`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div className={`font-headline font-black text-sm sm:text-base leading-snug ${
              activeTab === 'attendance' ? 'text-white' : 'text-slate-900'
            }`}>
              2. Room Attendance
            </div>
            <div className={`text-[11px] mt-0.5 ${
              activeTab === 'attendance' ? 'text-indigo-100' : 'text-slate-500'
            }`}>
              {activeDuty ? `Room ${activeDuty.roomNo}` : 'Mark hall attendance'}
            </div>
          </button>

          {/* 3. Duties History */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs hover:border-indigo-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${
              activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
            }`}>
              <History className="w-5 h-5" />
            </div>
            <div className={`font-headline font-black text-sm sm:text-base leading-snug ${
              activeTab === 'history' ? 'text-white' : 'text-slate-900'
            }`}>
              3. Duties History
            </div>
            <div className={`text-[11px] mt-0.5 ${
              activeTab === 'history' ? 'text-indigo-100' : 'text-slate-500'
            }`}>
              {historyDuties.length} previous duty record{historyDuties.length > 1 ? 's' : ''}
            </div>
          </button>

          {/* 4. Profile */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs hover:border-indigo-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${
              activeTab === 'profile' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-700'
            }`}>
              <User className="w-5 h-5" />
            </div>
            <div className={`font-headline font-black text-sm sm:text-base leading-snug ${
              activeTab === 'profile' ? 'text-white' : 'text-slate-900'
            }`}>
              4. Profile
            </div>
            <div className={`text-[11px] mt-0.5 ${
              activeTab === 'profile' ? 'text-indigo-100' : 'text-slate-500'
            }`}>
              Faculty info &amp; change PIN
            </div>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* ACTIVE SECTION CONTENT */}
        {/* ========================================================================= */}
        <div className="pt-2">
          {activeTab === 'today' && (
            <TodayDutiesView
              duties={todayDuties}
              onSelectDuty={handleSelectDutyForAttendance}
            />
          )}

          {activeTab === 'attendance' && (
            <div>
              {activeDuty ? (
                <RoomAttendanceSheet
                  duty={activeDuty}
                  onBack={() => setActiveTab('today')}
                />
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                  <DoorOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="font-bold text-slate-800 text-sm">Please select a duty first</h3>
                  <p className="text-xs text-slate-500 mt-1">Select an assigned duty from Today&apos;s Duties to take attendance.</p>
                  <Button
                    onClick={() => setActiveTab('today')}
                    className="mt-3 bg-[#1E2A5E] hover:bg-[#151D42] text-white text-xs font-bold h-9 rounded-xl"
                  >
                    View Today&apos;s Duties
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <DutiesHistoryView duties={historyDuties} />
          )}

          {activeTab === 'profile' && (
            <InvigilatorProfileView />
          )}
        </div>
      </main>
    </div>
  );
}
