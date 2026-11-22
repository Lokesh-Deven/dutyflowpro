"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useStudentSeating } from '@/lib/student-seating-context';
import { useAllotment } from '@/lib/allotment-context';
import { getDemoSeatingAllocation } from '@/lib/room-attendance-sample-data';
import {
  isRoomPublished,
} from '@/lib/room-attendance-publishing-service';
import {
  saveAttendanceSubmission,
  getAllAttendanceSubmissions,
} from '@/lib/invigilator-portal-service';
import { RoomAttendanceSubmission, StudentAttendanceRecord } from '@/lib/invigilator-portal-types';
import { RoomAttendanceTabs } from '@/components/dashboard/room-attendance/room-attendance-tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Smartphone,
  DoorOpen,
  Lock,
  CheckCircle2,
  XCircle,
  Save,
  ArrowLeft,
  Users,
  Search,
  CheckCheck,
  ShieldAlert,
  Clock,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface CandidateAttendance {
  rollNo: string;
  name: string;
  section: string;
  subject: string;
  benchLabel: string;
  benchSide: 'LEFT' | 'MIDDLE' | 'RIGHT';
  benchNumber: number;
  position: 'Side A' | 'Center' | 'Side B';
  status: 'Present' | 'Absent';
}

export default function AdminAttendancePage() {
  const { user, profile } = useAuth();
  const { allocations } = useStudentSeating();
  const { activeAllotment } = useAllotment();
  const { toast } = useToast();

  const [activeRoomNo, setActiveRoomNo] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, CandidateAttendance>>({});
  const [publishVersion, setPublishVersion] = useState(0);

  // Load allocation
  const currentAllocation = useMemo(() => {
    if (allocations && allocations.length > 0) return allocations[0];
    return getDemoSeatingAllocation();
  }, [allocations]);

  const examTitle = currentAllocation?.examination?.examName || 'Semester Examination 2026';
  const examDate = currentAllocation?.examination?.date || '2026-12-10';
  const examTimings = `${currentAllocation?.examination?.startTime || '11:00 AM'} – ${
    currentAllocation?.examination?.endTime || '12:30 PM'
  }`;

  // Listen for publish state changes
  useEffect(() => {
    const handlePublishChange = () => setPublishVersion((v) => v + 1);
    window.addEventListener('dutyflow:room-publishing-changed', handlePublishChange);
    return () => window.removeEventListener('dutyflow:room-publishing-changed', handlePublishChange);
  }, []);

  // Map of existing submissions
  const existingSubmissions = useMemo(() => {
    const subs = getAllAttendanceSubmissions();
    const map = new Map<string, RoomAttendanceSubmission>();
    subs.forEach((s) => map.set(String(s.roomNo).trim(), s));
    return map;
  }, [publishVersion]);

  // Invigilator name by room
  const invigilatorByRoom = useMemo(() => {
    const map = new Map<string, string>();
    if (activeAllotment?.roomAllocations) {
      Object.values(activeAllotment.roomAllocations).forEach((sessionAlloc) => {
        sessionAlloc.invigilatorDuties?.forEach((duty) => {
          map.set(String(duty.room).trim(), duty.invigilatorName);
        });
      });
    }
    return map;
  }, [activeAllotment]);

  // Prepared rooms with lock status
  const roomCards = useMemo(() => {
    return (currentAllocation?.roomPlans || []).map((plan) => {
      const roomNo = String(plan.roomNo).trim();
      const published = isRoomPublished(roomNo, currentAllocation?.id, user?.id);
      const submission = existingSubmissions.get(roomNo);
      const invigilator =
        invigilatorByRoom.get(roomNo) ||
        (roomNo === '101' ? 'Dr. Ramesh Kumar' : roomNo === '104' ? 'Prof. Anita Sharma' : 'Faculty Invigilator');

      const subjects = Array.from(
        new Set(
          plan.benches
            ?.flatMap((b) => b.seats)
            ?.map((s) => s.subjectName)
            ?.filter((n): n is string => Boolean(n))
        )
      ).join(', ') || 'Subjects';

      return {
        roomNo,
        plan,
        studentCount: plan.allocatedCount,
        capacity: plan.capacity,
        subject: subjects,
        invigilator,
        isPublished: published,
        submission,
      };
    });
  }, [currentAllocation, user?.id, existingSubmissions, invigilatorByRoom, publishVersion]);

  // Selected room plan
  const activeRoomPlan = useMemo(() => {
    if (!activeRoomNo) return null;
    return currentAllocation?.roomPlans?.find((r) => String(r.roomNo).trim() === activeRoomNo);
  }, [activeRoomNo, currentAllocation]);

  // Initialize students roster when active room changes
  // ORDER RULE: Sequential vertical order:
  // 1. Left side bench (L1, L2, L3...)
  // 2. Middle side bench (M1, M2, M3...)
  // 3. Right side bench (R1, R2, R3...)
  useEffect(() => {
    if (!activeRoomPlan) return;

    const initialMap: Record<string, CandidateAttendance> = {};
    const existing = existingSubmissions.get(String(activeRoomPlan.roomNo).trim());
    const existingRollStatus: Record<string, 'Present' | 'Absent'> = {};
    if (existing?.records) {
      existing.records.forEach((r) => {
        existingRollStatus[r.registerNumber] = r.status === 'Absent' ? 'Absent' : 'Present';
      });
    }

    const benches = activeRoomPlan.benches || [];

    // 1. Left Benches
    const leftBenches = benches.filter((b) => b.side === 'LEFT').sort((a, b) => a.benchNumber - b.benchNumber);
    // 2. Middle Benches
    const midBenches = benches.filter((b) => b.side === 'MIDDLE').sort((a, b) => a.benchNumber - b.benchNumber);
    // 3. Right Benches
    const rightBenches = benches.filter((b) => b.side === 'RIGHT').sort((a, b) => a.benchNumber - b.benchNumber);

    const orderedBenches = [...leftBenches, ...midBenches, ...rightBenches];

    orderedBenches.forEach((bench) => {
      const benchPrefix = bench.side === 'LEFT' ? 'L' : bench.side === 'MIDDLE' ? 'M' : 'R';
      const benchLabel = `${benchPrefix}${bench.benchNumber}`;

      bench.seats?.forEach((seat) => {
        if (seat.student && seat.student.rollNo) {
          const roll = seat.student.rollNo;
          const pos = seat.position === 'SIDE_A' ? 'Side A' : seat.position === 'SIDE_B' ? 'Side B' : 'Center';
          initialMap[roll] = {
            rollNo: roll,
            name: seat.student.name || 'Candidate',
            section: seat.student.section || 'A',
            subject: seat.subjectName || 'General',
            benchLabel,
            benchSide: bench.side,
            benchNumber: bench.benchNumber,
            position: pos,
            status: existingRollStatus[roll] || 'Present', // Default to Present
          };
        }
      });
    });

    setAttendanceRecords(initialMap);
  }, [activeRoomPlan, existingSubmissions]);

  // Candidates in sequential vertical order
  const orderedCandidates = useMemo(() => {
    return Object.values(attendanceRecords);
  }, [attendanceRecords]);

  // Toggle Present / Absent
  const handleToggle = (rollNo: string) => {
    setAttendanceRecords((prev) => {
      const cur = prev[rollNo];
      if (!cur) return prev;
      return {
        ...prev,
        [rollNo]: {
          ...cur,
          status: cur.status === 'Present' ? 'Absent' : 'Present',
        },
      };
    });
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((roll) => {
        next[roll] = { ...next[roll], status: 'Present' };
      });
      return next;
    });
    toast({
      title: 'Marked All Present',
      description: `All candidates in Room ${activeRoomNo} are marked Present.`,
    });
  };

  // Stats
  const activeStats = useMemo(() => {
    const list = Object.values(attendanceRecords);
    const present = list.filter((s) => s.status === 'Present').length;
    const absent = list.filter((s) => s.status === 'Absent').length;
    return { total: list.length, present, absent };
  }, [attendanceRecords]);

  // Submit attendance from floor walk
  const handleSubmitFloorWalkAttendance = () => {
    if (!activeRoomPlan || !activeRoomNo) return;
    const students = Object.values(attendanceRecords);
    if (students.length === 0) {
      toast({
        title: 'No Students Allocated',
        description: 'Cannot submit attendance for an empty room.',
        variant: 'destructive',
      });
      return;
    }

    const presentCount = students.filter((s) => s.status === 'Present').length;
    const absentCount = students.filter((s) => s.status === 'Absent').length;

    const formattedRecords: StudentAttendanceRecord[] = students.map((s) => ({
      registerNumber: s.rollNo,
      studentName: s.name,
      section: s.section,
      benchNumber: s.benchLabel,
      position: s.position === 'Side A' ? 'Left' : s.position === 'Side B' ? 'Right' : 'Center',
      status: s.status,
      subject: s.subject,
      markedAt: new Date().toISOString(),
    }));

    const now = new Date();
    const submission: RoomAttendanceSubmission = {
      id: `sub-admin-${activeRoomNo}-${Date.now()}`,
      dutyId: `duty-admin-${currentAllocation?.id}-${activeRoomNo}`,
      examinationId: currentAllocation?.examination?.examId || currentAllocation?.id || 'exam-admin',
      examName: examTitle,
      subjectName: activeRoomPlan.benches?.[0]?.seats?.[0]?.subjectName || 'Examination Subjects',
      date: examDate,
      sessionTime: examTimings,
      roomNo: activeRoomNo,
      invigilatorId: user?.id || 'admin-floor-walk',
      invigilatorName: profile?.signatory_name || 'Admin Floor Walk',
      totalStudents: students.length,
      presentCount,
      absentCount,
      submittedAt: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      submittedTimestamp: now.toISOString(),
      isLocked: true,
      source: 'Admin', // Tagged as Admin Floor Walk
      records: formattedRecords,
    };

    saveAttendanceSubmission(submission);

    toast({
      title: `Room ${activeRoomNo} Attendance Submitted!`,
      description: `Recorded via Admin Floor Walk: ${presentCount} Present, ${absentCount} Absent. Synced to Attendance Status.`,
    });

    // Close room roster and return to room selection panels
    setActiveRoomNo(null);
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* 4-Branch Navigation Switcher */}
      <RoomAttendanceTabs />

      {/* Roster View or Room Selection Panels */}
      {activeRoomNo && activeRoomPlan ? (
        /* ================= Active Room Mobile Floor Walk Roster ================= */
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Header Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveRoomNo(null)}
                className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-700"
              >
                <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline text-xl font-black text-slate-800 dark:text-white">
                    Room {activeRoomNo}
                  </h2>
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold text-[10px]">
                    Admin Floor Walk
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {orderedCandidates.length} Candidates • Tap card to toggle Present / Absent
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMarkAllPresent}
              className="text-xs h-8 px-2.5 gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 shrink-0"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Present</span>
            </Button>
          </div>

          {/* Sequential Order Instruction Notice */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-3 text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
            <span className="font-bold text-indigo-700 dark:text-indigo-400">Sequential Bench Order:</span>
            <span>1. Left Benches (L) &rarr; 2. Middle Benches (M) &rarr; 3. Right Benches (R)</span>
          </div>

          {/* Touch-Friendly Vertical Student Cards (No answer script inputs) */}
          <div className="space-y-2.5">
            {orderedCandidates.map((candidate) => {
              const isAbsent = candidate.status === 'Absent';

              return (
                <div
                  key={candidate.rollNo}
                  onClick={() => handleToggle(candidate.rollNo)}
                  className={cn(
                    "p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 shadow-2xs active:scale-[0.99]",
                    isAbsent
                      ? "bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 ring-2 ring-rose-300 dark:ring-rose-800 shadow-sm"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Bench Label */}
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold font-mono text-xs shrink-0 border",
                        isAbsent
                          ? "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                          : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                      )}
                    >
                      <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">
                        {candidate.benchSide === 'LEFT' ? 'Left' : candidate.benchSide === 'MIDDLE' ? 'Mid' : 'Right'}
                      </span>
                      <span className="text-sm font-black">{candidate.benchLabel}</span>
                    </div>

                    {/* Candidate Info */}
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                          {candidate.rollNo}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded-xs">
                          {candidate.position}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {candidate.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                        {candidate.subject} • Sec {candidate.section}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(candidate.rollNo);
                      }}
                      className={cn(
                        "h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer",
                        isAbsent
                          ? "bg-rose-600 text-white hover:bg-rose-700"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      )}
                    >
                      {isAbsent ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>Absent</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Present</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Floor-Walk Bottom Action Bar */}
          <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-300 dark:border-slate-700 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">Room {activeRoomNo}:</span>
              <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                {activeStats.present} Present
              </span>
              <span className="text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full">
                {activeStats.absent} Absent
              </span>
            </div>

            <Button
              type="button"
              onClick={handleSubmitFloorWalkAttendance}
              className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Submit Room</span>
            </Button>
          </div>
        </div>
      ) : (
        /* ================= Examination Room Selection Panels ================= */
        <div className="space-y-6">
          {/* Header Description */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl">
                  <Smartphone className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div>
                  <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                    Admin Attendance (Mobile Floor Walk)
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Tap an unpublished room to walk floor-to-floor and record attendance digitally on mobile
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{examDate}</span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{examTimings}</span>
            </div>
          </div>

          {/* Lock Rule Banner */}
          <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-amber-900 dark:text-amber-300">Exclusivity Access Rules:</div>
              <p className="text-amber-800/90 dark:text-amber-400/90 text-[11px] leading-relaxed">
                Only <strong>Unpublished</strong> rooms are open for Admin Attendance floor walk. If a room is marked <strong>Published to Invigilator</strong>, it is locked to prevent duplicate simultaneous entry. To edit it as admin, unpublish it in <strong>1. Invigilator Attendance</strong> first.
              </p>
            </div>
          </div>

          {/* Room Selection Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roomCards.map((room) => {
              const isLocked = room.isPublished;
              const isCompleted = Boolean(room.submission);

              return (
                <div
                  key={room.roomNo}
                  onClick={() => {
                    if (isLocked) {
                      toast({
                        variant: 'destructive',
                        title: `Room ${room.roomNo} is Locked`,
                        description: `Published to invigilator (${room.invigilator}). Please unpublish it in "Invigilator Attendance" to unlock admin attendance.`,
                      });
                      return;
                    }
                    setActiveRoomNo(room.roomNo);
                  }}
                  className={cn(
                    "rounded-2xl border p-5 transition-all select-none flex flex-col justify-between gap-4 shadow-2xs relative",
                    isLocked
                      ? "bg-slate-100/90 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 opacity-80 cursor-not-allowed"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md cursor-pointer group"
                  )}
                >
                  {/* Top: Room Number & Lock Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black font-mono text-base",
                          isLocked
                            ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            : "bg-[#1E2A5E] text-white shadow-xs group-hover:scale-105 transition-transform"
                        )}
                      >
                        {room.roomNo}
                      </div>
                      <div>
                        <div className="font-black font-headline text-base text-slate-800 dark:text-white">
                          Room {room.roomNo}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          {room.plan.totalBenches} Benches • Capacity {room.capacity}
                        </div>
                      </div>
                    </div>

                    {isLocked ? (
                      <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px] font-bold gap-1 px-2 py-0.5">
                        <Lock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                        Locked
                      </Badge>
                    ) : isCompleted ? (
                      <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px] font-bold gap-1 px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Recorded
                      </Badge>
                    ) : (
                      <Badge className="bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800 text-[10px] font-bold px-2 py-0.5">
                        Open for Walk
                      </Badge>
                    )}
                  </div>

                  {/* Middle: Duty & Candidate Details */}
                  <div className="space-y-1.5 py-1 text-xs border-y border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500 font-semibold">Invigilator:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                        {room.invigilator}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500 font-semibold">Subject:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                        {room.subject}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500 font-semibold">Allocated Students:</span>
                      <span className="font-black text-slate-900 dark:text-white font-mono">
                        {room.studentCount} Candidates
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Action state label */}
                  <div>
                    {isLocked ? (
                      <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 p-2 rounded-xl text-center flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Published to Invigilator — Unpublish to edit</span>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="w-full bg-[#1E2A5E] group-hover:bg-[#151D42] text-white font-bold text-xs h-9 rounded-xl shadow-xs"
                      >
                        <Smartphone className="w-3.5 h-3.5 mr-1" />
                        <span>Take Admin Attendance &rarr;</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
