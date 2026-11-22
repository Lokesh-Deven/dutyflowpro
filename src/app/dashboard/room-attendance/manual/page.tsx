"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useAllotment } from '@/lib/allotment-context';
import { useStudentSeating } from '@/lib/student-seating-context';
import {
  SeatingAllocationRecord,
  RoomSeatingPlan,
  BenchPositionSeat,
  PhysicalBench,
} from '@/lib/student-seating-types';
import { getDemoSeatingAllocation } from '@/lib/room-attendance-sample-data';
import {
  saveAttendanceSubmission,
  getAllAttendanceSubmissions,
} from '@/lib/invigilator-portal-service';
import { RoomAttendanceSubmission, StudentAttendanceRecord } from '@/lib/invigilator-portal-types';
import { RoomAttendanceTabs } from '@/components/dashboard/room-attendance/room-attendance-tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Printer,
  Smartphone,
  Monitor,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Download,
  Copy,
  Search,
  Filter,
  Users,
  DoorOpen,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  Save,
  Check,
  AlertTriangle,
  FileText,
  ChevronDown,
  LayoutGrid,
  List,
  Eye,
  CheckCheck,
} from 'lucide-react';

type AttendanceMode = 'manual_printable' | 'digital_interactive';
type ViewSubToggle = 'web_grid' | 'mobile_cards';

interface AttendanceStudentState {
  rollNo: string;
  name: string;
  section: string;
  subject: string;
  roomNo: string;
  benchLabel: string;
  position: 'Side A' | 'Center' | 'Side B';
  status: 'Present' | 'Absent';
  ansScriptNo: string;
}

export default function RoomAttendanceManualPage() {
  const { user, profile } = useAuth();
  const { examinations } = useAllotment();
  const { allocations } = useStudentSeating();
  const { toast } = useToast();

  // Mode & View States
  const [activeMode, setActiveMode] = useState<AttendanceMode>('manual_printable');
  const [viewSubToggle, setViewSubToggle] = useState<ViewSubToggle>('web_grid');

  // Selected Allocation / Exam
  const availableAllocations = useMemo(() => {
    if (allocations && allocations.length > 0) {
      return allocations;
    }
    return [getDemoSeatingAllocation()];
  }, [allocations]);

  const [selectedAllocationId, setSelectedAllocationId] = useState<string>(
    availableAllocations[0]?.id || 'demo-seating-allocation'
  );

  const currentAllocation: SeatingAllocationRecord = useMemo(() => {
    const found = availableAllocations.find((a) => a.id === selectedAllocationId);
    return found || availableAllocations[0] || getDemoSeatingAllocation();
  }, [availableAllocations, selectedAllocationId]);

  // Selected Room Filter: 'ALL' or specific roomNo
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');

  // Interactive Attendance Records State: Keyed by rollNo
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStudentState>>({});
  const [isAttendanceInitialized, setIsAttendanceInitialized] = useState(false);

  // Search Filter for Web & Mobile
  const [searchQuery, setSearchQuery] = useState('');

  // Absentees Report Modal
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportRoomScope, setReportRoomScope] = useState<string>('ALL');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Print scope state for Mode 1
  const [printScope, setPrintScope] = useState<'current' | 'all'>('all');

  // College & Exam Names
  const collegeName =
    profile?.institution_name?.trim() ||
    examinations?.[0]?.college?.trim() ||
    'DUTYFLOW EXAMINATIONS INSTITUTION';

  const examTitle =
    currentAllocation?.examination?.examName ||
    currentAllocation?.name ||
    'Semester End Examination 2026';

  const examDate = currentAllocation?.examination?.date || '2026-12-10';
  const examTimings = `${currentAllocation?.examination?.startTime || '11:00 AM'} – ${
    currentAllocation?.examination?.endTime || '12:30 PM'
  }`;

  // Format date with day name
  const dateWithDay = useMemo(() => {
    if (!examDate) return '10.12.2026 (Thursday)';
    try {
      const d = new Date(examDate);
      if (isNaN(d.getTime())) return examDate;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${dayNum}.${monthNum}.${year} (${dayName})`;
    } catch {
      return examDate;
    }
  }, [examDate]);

  // Initialize or re-initialize attendance records when allocation changes
  useEffect(() => {
    const initialMap: Record<string, AttendanceStudentState> = {};
    const submissions = getAllAttendanceSubmissions();

    // Check if any existing submission matches this allocation's rooms
    const subMapByRoll: Record<string, { status: 'Present' | 'Absent'; ansScriptNo?: string }> = {};
    for (const sub of submissions) {
      if (sub.records) {
        for (const rec of sub.records) {
          subMapByRoll[rec.registerNumber] = {
            status: rec.status === 'Absent' ? 'Absent' : 'Present',
            ansScriptNo: (rec as any).ansScriptNo || '',
          };
        }
      }
    }

    currentAllocation.roomPlans?.forEach((room) => {
      room.benches?.forEach((bench) => {
        const benchPrefix = bench.side === 'LEFT' ? 'L' : bench.side === 'MIDDLE' ? 'M' : 'R';
        const benchLabel = `${benchPrefix}${bench.benchNumber}`;

        bench.seats?.forEach((seat) => {
          if (seat.student && seat.student.rollNo) {
            const roll = seat.student.rollNo;
            const posLabel =
              seat.position === 'SIDE_A' ? 'Side A' : seat.position === 'SIDE_B' ? 'Side B' : 'Center';

            const existing = subMapByRoll[roll];

            initialMap[roll] = {
              rollNo: roll,
              name: seat.student.name || 'Candidate',
              section: seat.student.section || 'A',
              subject: seat.subjectName || 'General',
              roomNo: String(room.roomNo),
              benchLabel,
              position: posLabel,
              status: existing ? existing.status : 'Present', // Default to Present as required
              ansScriptNo: existing?.ansScriptNo || '',
            };
          }
        });
      });
    });

    setAttendanceState(initialMap);
    setIsAttendanceInitialized(true);
  }, [currentAllocation]);

  // Rooms to display based on selected room filter
  const displayedRooms: RoomSeatingPlan[] = useMemo(() => {
    if (!currentAllocation.roomPlans) return [];
    if (selectedRoomFilter === 'ALL') {
      return currentAllocation.roomPlans;
    }
    return currentAllocation.roomPlans.filter(
      (r) => String(r.roomNo) === String(selectedRoomFilter)
    );
  }, [currentAllocation, selectedRoomFilter]);

  // Toggle student attendance status between Present and Absent
  const toggleAttendanceStatus = (rollNo: string) => {
    setAttendanceState((prev) => {
      const cur = prev[rollNo];
      if (!cur) return prev;
      const nextStatus = cur.status === 'Present' ? 'Absent' : 'Present';
      return {
        ...prev,
        [rollNo]: {
          ...cur,
          status: nextStatus,
        },
      };
    });
  };

  // Update Ans. Script No
  const updateAnsScriptNo = (rollNo: string, val: string) => {
    setAttendanceState((prev) => {
      const cur = prev[rollNo];
      if (!cur) return prev;
      return {
        ...prev,
        [rollNo]: {
          ...cur,
          ansScriptNo: val,
        },
      };
    });
  };

  // Mark all students in current room (or all rooms) as Present
  const handleMarkAllPresent = (targetRoomNo?: string) => {
    setAttendanceState((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((roll) => {
        if (!targetRoomNo || targetRoomNo === 'ALL' || next[roll].roomNo === targetRoomNo) {
          next[roll] = { ...next[roll], status: 'Present' };
        }
      });
      return next;
    });
    toast({
      title: "All Marked Present",
      description: `All students in ${targetRoomNo && targetRoomNo !== 'ALL' ? `Room ${targetRoomNo}` : 'all rooms'} have been marked Present.`,
    });
  };

  // Live stats calculation for a specific room or across all rooms
  const getRoomStats = (roomNo: string) => {
    let total = 0;
    let present = 0;
    let absent = 0;

    Object.values(attendanceState).forEach((item) => {
      if (item.roomNo === String(roomNo)) {
        total++;
        if (item.status === 'Present') present++;
        else if (item.status === 'Absent') absent++;
      }
    });

    return { total, present, absent };
  };

  // Overall stats for active room filter
  const activeStats = useMemo(() => {
    let total = 0;
    let present = 0;
    let absent = 0;

    Object.values(attendanceState).forEach((item) => {
      if (selectedRoomFilter === 'ALL' || item.roomNo === String(selectedRoomFilter)) {
        total++;
        if (item.status === 'Present') present++;
        else if (item.status === 'Absent') absent++;
      }
    });

    return { total, present, absent };
  }, [attendanceState, selectedRoomFilter]);

  // Submit attendance for the selected room(s)
  const handleSubmitAttendance = (roomNo?: string) => {
    const targetRoom = roomNo || (selectedRoomFilter !== 'ALL' ? selectedRoomFilter : displayedRooms[0]?.roomNo);
    if (!targetRoom) {
      toast({
        title: "No Room Selected",
        description: "Please select a specific room to submit attendance.",
        variant: "destructive",
      });
      return;
    }

    const studentsInRoom = Object.values(attendanceState).filter((s) => s.roomNo === String(targetRoom));
    if (studentsInRoom.length === 0) {
      toast({
        title: "No Students Allocated",
        description: `Room ${targetRoom} has no student records allocated.`,
        variant: "destructive",
      });
      return;
    }

    const presentCount = studentsInRoom.filter((s) => s.status === 'Present').length;
    const absentCount = studentsInRoom.filter((s) => s.status === 'Absent').length;

    const formattedRecords: StudentAttendanceRecord[] = studentsInRoom.map((s) => ({
      registerNumber: s.rollNo,
      studentName: s.name,
      section: s.section,
      benchNumber: s.benchLabel,
      position: s.position === 'Side A' ? 'Left' : s.position === 'Side B' ? 'Right' : 'Center',
      status: s.status,
      ansScriptNo: s.ansScriptNo,
      subject: s.subject,
      markedAt: new Date().toISOString(),
    }));

    const now = new Date();
    const submission: RoomAttendanceSubmission = {
      id: `sub-room-${targetRoom}-${Date.now()}`,
      dutyId: `duty-${currentAllocation.id}-${targetRoom}`,
      examinationId: currentAllocation.examination?.examId || currentAllocation.id,
      examName: examTitle,
      subjectName: currentAllocation.subjectStats?.map((s) => s.subjectName).join(', ') || 'Examinations',
      date: examDate,
      sessionTime: examTimings,
      roomNo: String(targetRoom),
      invigilatorId: user?.id || 'admin-user',
      invigilatorName: profile?.signatory_name || 'Chief Superintendent',
      totalStudents: studentsInRoom.length,
      presentCount,
      absentCount,
      submittedAt: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      submittedTimestamp: now.toISOString(),
      isLocked: true,
      source: 'Manual',
      records: formattedRecords,
    };

    saveAttendanceSubmission(submission);

    toast({
      title: `Room ${targetRoom} Attendance Submitted!`,
      description: `Saved: ${presentCount} Present, ${absentCount} Absent. Live monitors updated.`,
    });
  };

  // Compile list of absentees based on selected scope
  const absenteesList = useMemo(() => {
    return Object.values(attendanceState)
      .filter((item) => {
        if (item.status !== 'Absent') return false;
        if (reportRoomScope !== 'ALL' && item.roomNo !== reportRoomScope) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.roomNo !== b.roomNo) return a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true });
        return a.rollNo.localeCompare(b.rollNo);
      });
  }, [attendanceState, reportRoomScope]);

  // Formatted string list for quick copy (as requested in user prompt)
  // Format: Sl No – Name – Section – Roll No – Subject – Status
  const formattedAbsenteesText = useMemo(() => {
    if (absenteesList.length === 0) {
      return "Nil Absentees. All candidates present.";
    }

    const lines = [
      `ABSENTEES REPORT`,
      `Institution: ${collegeName}`,
      `Examination: ${examTitle}`,
      `Date & Session: ${dateWithDay} | ${examTimings}`,
      `Room Scope: ${reportRoomScope === 'ALL' ? 'All Examination Rooms' : `Room No. ${reportRoomScope}`}`,
      `Total Absentees: ${absenteesList.length}`,
      `------------------------------------------------------------`,
      `Sl No – Name – Section – Roll No – Subject – Status`,
      ...absenteesList.map(
        (s, idx) =>
          `${idx + 1}. ${s.name} - ${s.section} – ${s.rollNo} – ${s.subject} - Absent`
      ),
    ];

    return lines.join('\n');
  }, [absenteesList, collegeName, examTitle, dateWithDay, examTimings, reportRoomScope]);

  // Copy formatted text
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedAbsenteesText);
      setCopiedSuccess(true);
      toast({
        title: "Copied to Clipboard!",
        description: "Formatted absentees list is ready to paste into WhatsApp, email, or reports.",
      });
      setTimeout(() => setCopiedSuccess(false), 2500);
    } catch {
      toast({
        title: "Copy Failed",
        description: "Could not write to clipboard.",
        variant: "destructive",
      });
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (absenteesList.length === 0) {
      toast({
        title: "No Absentees",
        description: "There are no absentees to export for this selection.",
      });
      return;
    }

    const headers = [
      'Sl No',
      'Student Name',
      'Section',
      'Roll No',
      'Subject',
      'Room No',
      'Bench',
      'Position',
      'Ans Script No',
      'Status',
    ];

    const rows = absenteesList.map((s, idx) => [
      idx + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.section}"`,
      `"${s.rollNo}"`,
      `"${s.subject}"`,
      `"${s.roomNo}"`,
      `"${s.benchLabel}"`,
      `"${s.position}"`,
      `"${s.ansScriptNo || ''}"`,
      'Absent',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Dutyflow_Absentees_Report_${examDate}_Room_${reportRoomScope}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV Exported",
      description: "Absentees CSV file downloaded successfully.",
    });
  };

  // Trigger Print for Mode 1
  const handlePrintManualSheets = (scope: 'current' | 'all') => {
    setPrintScope(scope);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Filtered students for Mobile / Web Search in Mode 2
  const filteredStudentsForSearch = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return Object.values(attendanceState).filter(
      (s) =>
        s.rollNo.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q)
    );
  }, [attendanceState, searchQuery]);

  return (
    <div className="space-y-6 pb-28 max-w-7xl mx-auto">
      {/* Print-Only Stylesheet (Enforces Strict B&W Minimalist Styling, A4 Landscape & 1-Page-Per-Room Fit) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm 6mm 5mm 6mm;
          }
          html,
          body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide all application shells, navigation, controls, and dialogs */
          header,
          nav,
          aside,
          .no-print,
          .sidebar-container,
          button,
          .sticky-action-bar,
          .screen-only-controls {
            display: none !important;
          }
          /* Manual Sheet A4 Landscape Page Isolation - STRICT 1 PAGE PER ROOM */
          .manual-sheet-page {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: 196mm !important;
            max-height: 196mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .manual-sheet-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          /* Force crisp black text and borders */
          .manual-sheet-page * {
            box-shadow: none !important;
            text-shadow: none !important;
            color: #000000 !important;
            border-color: #000000 !important;
          }
          /* Hide elements tagged screen-only */
          .screen-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen-Only Header & Top Controls */}
      <div className="screen-only-controls space-y-6">
        {/* 4-Branch Navigation Switcher */}
        <RoomAttendanceTabs />

        {/* Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-[#1E2A5E] dark:text-indigo-400 rounded-xl shadow-xs">
                <FileSpreadsheet className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                  Manual Attendance
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Printable manual attendance sheets mirroring seating layouts &amp; post-exam web app digitization
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReportRoomScope(selectedRoomFilter);
                setIsReportOpen(true);
              }}
              className="text-xs h-9 px-3.5 gap-1.5 font-bold text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Generate Absentees Report</span>
              {activeStats.absent > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-black">
                  {activeStats.absent}
                </span>
              )}
            </Button>

            {activeMode === 'manual_printable' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Manual Sheets</span>
                    <ChevronDown className="w-3 h-3 opacity-80" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                  <DropdownMenuItem
                    onClick={() => handlePrintManualSheets('all')}
                    className="text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Printer className="w-3.5 h-3.5 mr-2 text-indigo-600 dark:text-indigo-400" />
                    Print All Rooms ({displayedRooms.length} Sheets)
                  </DropdownMenuItem>
                  {selectedRoomFilter !== 'ALL' && (
                    <DropdownMenuItem
                      onClick={() => handlePrintManualSheets('current')}
                      className="text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <DoorOpen className="w-3.5 h-3.5 mr-2 text-emerald-600 dark:text-emerald-400" />
                      Print Room {selectedRoomFilter} Only
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Top Mode Switcher Tabs */}
        <div className="bg-slate-100/90 dark:bg-slate-900 p-1.5 rounded-2xl flex flex-col sm:flex-row items-center gap-2 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveMode('manual_printable')}
            className={cn(
              "flex-1 w-full py-2.5 px-4 rounded-xl font-headline font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer",
              activeMode === 'manual_printable'
                ? "bg-white dark:bg-slate-800 text-[#1E2A5E] dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
            )}
          >
            <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Mode 1: Manual Attendance (Printable Sheet)</span>
            <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 ml-1 font-semibold">
              Ink-Friendly B&amp;W
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('digital_interactive')}
            className={cn(
              "flex-1 w-full py-2.5 px-4 rounded-xl font-headline font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer",
              activeMode === 'digital_interactive'
                ? "bg-white dark:bg-slate-800 text-[#1E2A5E] dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
            )}
          >
            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Mode 2: Digital Attendance (Web app Entry)</span>
            <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] ml-1 font-bold">
              Live Digitization
            </Badge>
          </button>
        </div>

        {/* Multi-Level Filters Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Examination / Allocation Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Exam:</span>
              <select
                value={selectedAllocationId}
                onChange={(e) => {
                  setSelectedAllocationId(e.target.value);
                  setSelectedRoomFilter('ALL');
                }}
                className="text-xs font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {availableAllocations.map((alloc) => (
                  <option key={alloc.id} value={alloc.id}>
                    {alloc.examination?.examName || alloc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Session Info */}
            <div className="flex items-center gap-2 bg-indigo-50/60 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 rounded-lg px-3 py-1.5 text-xs text-indigo-900 dark:text-indigo-300 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{dateWithDay}</span>
              <span className="text-indigo-300 dark:text-indigo-700">|</span>
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{examTimings}</span>
            </div>

            {/* Room Filter Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Room:</span>
              <select
                value={selectedRoomFilter}
                onChange={(e) => setSelectedRoomFilter(e.target.value)}
                className="text-xs font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Rooms ({currentAllocation.roomPlans?.length || 0})</option>
                {currentAllocation.roomPlans?.map((r) => (
                  <option key={r.roomId || r.roomNo} value={r.roomNo}>
                    Room No. {r.roomNo} ({r.allocatedCount} Allocated)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode 2 View Sub-Toggle (Web Grid vs Mobile Cards) */}
          {activeMode === 'digital_interactive' && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewSubToggle('web_grid')}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer",
                  viewSubToggle === 'web_grid'
                    ? "bg-white dark:bg-slate-700 text-indigo-900 dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Web Grid View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewSubToggle('mobile_cards')}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer",
                  viewSubToggle === 'mobile_cards'
                    ? "bg-white dark:bg-slate-700 text-indigo-900 dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile View</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: PRINTABLE "ROOM ATTENDANCE (MANUAL)" SHEET (MIRRORS SEATING PLAN) */}
      {/* ========================================================================= */}
      {activeMode === 'manual_printable' && (
        <div className="space-y-8">
          {/* Informational Banner on Screen */}
          <div className="screen-only-controls bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-300">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>A4 Landscape Format (Strict 1-Page Per Room):</strong> Optimized for ink-saving black &amp; white printing. Automatically configured in Landscape orientation so each examination room fits completely onto a single A4 page with handwriting lines for Ans. Script No. &amp; Signature.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-bold">
                A4 Landscape
              </Badge>
              <Button
                size="sm"
                onClick={() => handlePrintManualSheets('all')}
                className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-8 px-3 gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Landscape Sheets</span>
              </Button>
            </div>
          </div>

          {/* Render Each Room's Manual Sheet (A4 Landscape strictly fits 1 page) */}
          {displayedRooms.map((room) => {
            const leftBenches = room.benches?.filter((b) => b.side === 'LEFT') || [];
            const middleBenches = room.benches?.filter((b) => b.side === 'MIDDLE') || [];
            const rightBenches = room.benches?.filter((b) => b.side === 'RIGHT') || [];
            const hasMiddleColumn = middleBenches.length > 0;

            // Gather unique subjects in this room
            const roomSubjects = Array.from(
              new Set(
                room.benches
                  ?.flatMap((b) => b.seats)
                  ?.map((s) => s.subjectName)
                  ?.filter((n): n is string => Boolean(n))
              )
            ).join(', ') || 'Prescribed Examination Subjects';

            return (
              <div
                key={room.roomId || room.roomNo}
                className="manual-sheet-page bg-white text-black p-4 sm:p-5 rounded-xl border border-slate-300 shadow-sm max-w-[1100px] mx-auto flex flex-col justify-between print:max-w-none print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none"
              >
                <div>
                  {/* 1. Centered Institutional Header */}
                  <div className="text-center space-y-0.5 pb-1">
                    <h2 className="text-sm sm:text-base font-black tracking-tight uppercase text-black leading-tight">
                      {collegeName}
                    </h2>
                    <h3 className="text-xs sm:text-sm font-bold text-black uppercase tracking-wide leading-tight">
                      {examTitle}
                    </h3>
                    <div className="text-[10px] font-bold text-black uppercase tracking-wider underline leading-none py-0.5">
                      STUDENT ATTENDANCE SHEET
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-black tracking-tight pt-0.5 leading-none">
                      EXAMINATION ROOM NO: {room.roomNo}
                    </h4>
                  </div>

                  {/* 2. Two-Column Metadata Bar */}
                  <div className="border-y border-black py-1 my-1.5 flex justify-between text-[10px] text-black font-medium gap-2 leading-tight">
                    {/* Left Side */}
                    <div className="space-y-0.5">
                      <div>
                        <span className="font-bold">Date: </span>
                        <span>{dateWithDay}</span>
                      </div>
                      <div>
                        <span className="font-bold">Subject(s): </span>
                        <span>{roomSubjects}</span>
                      </div>
                      <div>
                        <span className="font-bold">Timings: </span>
                        <span>{examTimings}</span>
                      </div>
                    </div>

                    {/* Right Side */}
                    <div className="text-right space-y-0.5">
                      <div>
                        <span className="font-bold">Total Capacity: </span>
                        <span>{room.capacity || room.totalBenches * 2} Students</span>
                      </div>
                      <div>
                        <span className="font-bold">Allocated: </span>
                        <span>{room.allocatedCount} Students</span>
                      </div>
                      <div>
                        <span className="font-bold">Vacant: </span>
                        <span>{room.vacantCount} Seats</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Blackboard • Front of Room Header */}
                  <div className="border border-black text-center py-0.5 text-[9.5px] font-bold uppercase tracking-wider mb-1.5 bg-white leading-tight">
                    Blackboard • Front of Room (Teacher&apos;s Stage)
                  </div>

                  {/* 4. Column Headers */}
                  <div
                    className={cn(
                      "grid gap-2 sm:gap-3 mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-black",
                      hasMiddleColumn ? "grid-cols-3" : "grid-cols-2"
                    )}
                  >
                    <div className="border-b border-black pb-0.5">
                      Left Side Benches ({leftBenches.length})
                    </div>
                    {hasMiddleColumn && (
                      <div className="border-b border-black pb-0.5">
                        Middle Benches ({middleBenches.length})
                      </div>
                    )}
                    <div className="border-b border-black pb-0.5">
                      Right Side Benches ({rightBenches.length})
                    </div>
                  </div>

                  {/* 5. Seating Columns Layout (Mirrors Seating Allocation) */}
                  <div
                    className={cn(
                      "grid gap-2 sm:gap-3 items-start",
                      hasMiddleColumn ? "grid-cols-3" : "grid-cols-2"
                    )}
                  >
                    {/* Left Column Benches */}
                    <div className="space-y-1">
                      {leftBenches.map((bench) => (
                        <ManualBenchRow key={`left-${bench.benchNumber}`} bench={bench} />
                      ))}
                    </div>

                    {/* Middle Column Benches (if 3-column room) */}
                    {hasMiddleColumn && (
                      <div className="space-y-1">
                        {middleBenches.map((bench) => (
                          <ManualBenchRow key={`mid-${bench.benchNumber}`} bench={bench} />
                        ))}
                      </div>
                    )}

                    {/* Right Column Benches */}
                    <div className="space-y-1">
                      {rightBenches.map((bench) => (
                        <ManualBenchRow key={`right-${bench.benchNumber}`} bench={bench} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 6. Bottom Invigilator Summary Footer */}
                <div className="border-t border-black mt-2 pt-1.5 text-[10px] text-black space-y-1 leading-tight">
                  <div className="flex items-center justify-between font-bold">
                    <span>Total: {room.allocatedCount}</span>
                    <span>Present: ______________</span>
                    <span>Absent: ______________</span>
                  </div>
                  <div className="flex items-center justify-between font-bold pt-0.5">
                    <span className="flex-1">
                      Invigilator Name: ________________________________
                    </span>
                    <span className="flex-1 text-right">
                      Invigilator Sign: ________________________________
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: DIGITAL ATTENDANCE (INTERACTIVE WEB & MOBILE ENTRY)               */}
      {/* ========================================================================= */}
      {activeMode === 'digital_interactive' && (
        <div className="space-y-6">
          {/* Quick Filter & Global Action Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Roll No, Name, or Subject..."
                className="pl-9 text-xs h-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleMarkAllPresent(selectedRoomFilter)}
                className="text-xs h-9 px-3 gap-1.5 font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Present</span>
              </Button>
            </div>
          </div>

          {/* Search Result Matches if searching */}
          {searchQuery.trim() && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-amber-900 flex items-center justify-between">
                <span>Search Matches ({filteredStudentsForSearch.length} Students found)</span>
                <span className="text-[10px] text-amber-700">Click any card to toggle Present / Absent</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStudentsForSearch.map((student) => (
                  <DigitalStudentCard
                    key={student.rollNo}
                    student={student}
                    onToggle={() => toggleAttendanceStatus(student.rollNo)}
                    onAnsScriptChange={(val) => updateAnsScriptNo(student.rollNo, val)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sub-View: Web Grid View vs Mobile Cards View */}
          {viewSubToggle === 'web_grid' ? (
            /* ================= Web Grid View ================= */
            <div className="space-y-8">
              {displayedRooms.map((room) => {
                const leftBenches = room.benches?.filter((b) => b.side === 'LEFT') || [];
                const middleBenches = room.benches?.filter((b) => b.side === 'MIDDLE') || [];
                const rightBenches = room.benches?.filter((b) => b.side === 'RIGHT') || [];
                const hasMiddleColumn = middleBenches.length > 0;
                const stats = getRoomStats(room.roomNo);

                return (
                  <div
                    key={room.roomId || room.roomNo}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
                  >
                    {/* Room Diagram Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-[#1E2A5E]/10 dark:bg-indigo-950/60 text-[#1E2A5E] dark:text-indigo-400 rounded-xl">
                          <DoorOpen className="w-5 h-5 text-indigo-800 dark:text-indigo-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-headline text-lg font-black text-slate-800 dark:text-white">
                              Room No. {room.roomNo}
                            </h3>
                            <Badge variant="outline" className="text-[10px] font-bold text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                              {hasMiddleColumn ? '3-Column Layout' : '2-Column Layout'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {room.totalBenches} Benches • Capacity: {room.capacity}
                          </p>
                        </div>
                      </div>

                      {/* Live Counter Badges */}
                      <div className="flex items-center gap-2">
                        <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 text-xs px-2.5 py-1 font-bold">
                          Allocated: {stats.total}
                        </Badge>
                        <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-xs px-2.5 py-1 font-bold gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Present: {stats.present}
                        </Badge>
                        <Badge className="bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 text-xs px-2.5 py-1 font-bold gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Absent: {stats.absent}
                        </Badge>
                      </div>
                    </div>

                    {/* Blackboard Teacher's Stage */}
                    <div className="w-full bg-[#1e293b] text-white py-2 rounded-xl text-center text-xs font-headline font-bold uppercase tracking-wider shadow-inner">
                      Blackboard • Front of Room (Teacher&apos;s Stage)
                    </div>

                    {/* Grid Columns */}
                    <div
                      className={cn(
                        "grid gap-4 items-start",
                        hasMiddleColumn ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"
                      )}
                    >
                      {/* Left Column Benches */}
                      <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-800 text-center">
                          Left Side Benches ({leftBenches.length})
                        </div>
                        {leftBenches.map((bench) => (
                          <InteractiveBenchCard
                            key={`inter-left-${bench.benchNumber}`}
                            bench={bench}
                            attendanceState={attendanceState}
                            onToggle={toggleAttendanceStatus}
                            onAnsScriptChange={updateAnsScriptNo}
                          />
                        ))}
                      </div>

                      {/* Middle Column Benches */}
                      {hasMiddleColumn && (
                        <div className="space-y-3">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-800 text-center">
                            Middle Benches ({middleBenches.length})
                          </div>
                          {middleBenches.map((bench) => (
                            <InteractiveBenchCard
                              key={`inter-mid-${bench.benchNumber}`}
                              bench={bench}
                              attendanceState={attendanceState}
                              onToggle={toggleAttendanceStatus}
                              onAnsScriptChange={updateAnsScriptNo}
                            />
                          ))}
                        </div>
                      )}

                      {/* Right Column Benches */}
                      <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-800 text-center">
                          Right Side Benches ({rightBenches.length})
                        </div>
                        {rightBenches.map((bench) => (
                          <InteractiveBenchCard
                            key={`inter-right-${bench.benchNumber}`}
                            bench={bench}
                            attendanceState={attendanceState}
                            onToggle={toggleAttendanceStatus}
                            onAnsScriptChange={updateAnsScriptNo}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= Mobile Cards View (Single-Column Touch-Friendly) ================= */
            <div className="space-y-6">
              {displayedRooms.map((room) => {
                const studentsInRoom = Object.values(attendanceState).filter(
                  (s) => s.roomNo === String(room.roomNo)
                );
                const stats = getRoomStats(room.roomNo);

                return (
                  <div
                    key={`mob-${room.roomId || room.roomNo}`}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="font-headline text-lg font-black text-slate-800 dark:text-white">
                          Room No. {room.roomNo}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {studentsInRoom.length} Candidates • Touch card to toggle Absent
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {stats.present} P
                        </span>
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          {stats.absent} A
                        </span>
                      </div>
                    </div>

                    {/* Single-Column Touch-Friendly Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {studentsInRoom.map((student) => (
                        <DigitalStudentCard
                          key={student.rollNo}
                          student={student}
                          onToggle={() => toggleAttendanceStatus(student.rollNo)}
                          onAnsScriptChange={(val) => updateAnsScriptNo(student.rollNo, val)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Live Action & Summary Bar */}
          <div className="sticky-action-bar fixed bottom-4 left-4 right-4 max-w-5xl mx-auto z-40 bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl p-3.5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <DoorOpen className="w-4 h-4 text-indigo-700" />
                <span>
                  {selectedRoomFilter === 'ALL'
                    ? `All Rooms (${displayedRooms.length})`
                    : `Room ${selectedRoomFilter}`}
                </span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="font-semibold text-slate-600">
                Allocated: <strong className="text-slate-900">{activeStats.total}</strong>
              </div>
              <span className="text-slate-300">|</span>
              <div className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Present: {activeStats.present}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Absent: {activeStats.absent}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setReportRoomScope(selectedRoomFilter);
                  setIsReportOpen(true);
                }}
                className="text-xs h-9 px-3 gap-1.5 font-bold text-rose-700 border-rose-300 hover:bg-rose-50"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Absentees</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleSubmitAttendance()}
                className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-sm transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Submit Attendance</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABSENTEES REPORT MODAL / DIALOG                                           */}
      {/* ========================================================================= */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-xl">
                <Users className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-800 dark:text-white">
                  Absentees Report Generator
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  {collegeName} • {examTitle}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Scope Selector in Modal */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600 dark:text-slate-300">Filter Scope:</span>
              <select
                value={reportRoomScope}
                onChange={(e) => setReportRoomScope(e.target.value)}
                className="text-xs font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Rooms in Session ({displayedRooms.length} Rooms)</option>
                {currentAllocation.roomPlans?.map((r) => (
                  <option key={`rep-${r.roomId || r.roomNo}`} value={r.roomNo}>
                    Room No. {r.roomNo}
                  </option>
                ))}
              </select>
            </div>

            {/* Total Absentees Badge */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Total Absentees:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-black text-xs border border-rose-200 dark:border-rose-800">
                {absenteesList.length} Students
              </span>
            </div>
          </div>

          {/* Absentees Structured Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100/90 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Structured Candidate Table</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {dateWithDay} • {examTimings}
              </span>
            </div>

            {absenteesList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-sm text-slate-800 dark:text-white">100% Attendance Recorded!</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  There are no candidates marked absent in this selection.
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3 text-center w-12">#</th>
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-2 text-center w-16">Section</th>
                      <th className="py-2 px-3 font-mono">Roll No</th>
                      <th className="py-2 px-3">Subject</th>
                      <th className="py-2 px-2 text-center w-20">Room No</th>
                      <th className="py-2 px-2 text-center w-16">Bench</th>
                      <th className="py-2 px-3 text-center w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {absenteesList.map((item, idx) => (
                      <tr key={item.rollNo} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/30 transition-colors">
                        <td className="py-2 px-3 text-center font-bold text-slate-400 dark:text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">{item.name}</td>
                        <td className="py-2 px-2 text-center font-semibold text-slate-600 dark:text-slate-400">
                          {item.section}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {item.rollNo}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-600 dark:text-slate-400">{item.subject}</td>
                        <td className="py-2 px-2 text-center font-bold text-indigo-700 dark:text-indigo-400">
                          {item.roomNo}
                        </td>
                        <td className="py-2 px-2 text-center font-semibold text-slate-600 dark:text-slate-400">
                          {item.benchLabel}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            Absent
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Formatted Plain Text List Box (Sl No – Name – Section – Roll No – Subject – Status) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Formatted List (Ready for WhatsApp / Notice Board)</span>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-3.5 rounded-xl text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border border-slate-800">
              {formattedAbsenteesText}
            </pre>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Generated: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyText}
                className="text-xs h-9 px-3 gap-1.5 font-bold"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy List</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="text-xs h-9 px-3 gap-1.5 font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => window.print()}
                className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-3.5 gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =========================================================================
// SUB-COMPONENTS
// =========================================================================

/**
 * Mode 1: Manual Printable Bench Row
 * Renders bench card in pure black-and-white for ink-friendly printing
 * Formatted compactly for Landscape A4 so 8-10 benches strictly fit 1 page
 */
function ManualBenchRow({ bench }: { bench: PhysicalBench }) {
  const benchPrefix = bench.side === 'LEFT' ? 'L' : bench.side === 'MIDDLE' ? 'M' : 'R';
  const benchLabel = `${benchPrefix}${bench.benchNumber}`;

  return (
    <div className="flex items-stretch gap-1 border border-black p-0.5 sm:p-1 rounded bg-white">
      {/* Bench Label Box */}
      <div className="w-8 sm:w-9 shrink-0 flex flex-col items-center justify-center border-r border-black pr-0.5 font-bold text-black select-none">
        <span className="text-[7.5px] uppercase tracking-tighter leading-none">BENCH</span>
        <span className="font-black text-[11px] leading-tight">{benchLabel}</span>
      </div>

      {/* Bench Seats */}
      <div className="flex-1 flex gap-1 min-w-0">
        {bench.seats?.map((seat, sIdx) => {
          const posLabel =
            seat.position === 'SIDE_A' ? 'A' : seat.position === 'SIDE_B' ? 'B' : 'C';

          if (seat.isDisabled || (!seat.student && seat.isVacant)) {
            return (
              <div
                key={sIdx}
                className="flex-1 p-0.5 rounded border border-black/40 text-center flex flex-col justify-center items-center min-w-0 text-black/50"
              >
                <span className="text-[7.5px] font-bold leading-none">[{posLabel}]</span>
                <span className="text-[8.5px] font-semibold tracking-wider italic leading-none mt-0.5">VACANT</span>
              </div>
            );
          }

          return (
            <div
              key={sIdx}
              className="flex-1 p-0.5 sm:p-1 rounded border border-black text-left flex flex-col justify-between min-w-0 bg-white leading-tight"
            >
              {/* Header: Roll No, Section & Position */}
              <div className="flex items-center justify-between gap-1 leading-none">
                <span className="font-black text-[10.5px] text-black">
                  {seat.student?.rollNo}
                </span>
                <div className="flex items-center gap-0.5">
                  {seat.student?.section && (
                    <span className="text-[8px] font-semibold text-black/70">
                      {seat.student.section}
                    </span>
                  )}
                  <span className="text-[8px] font-bold text-black border border-black px-0.5 rounded-xs leading-none">
                    {posLabel}
                  </span>
                </div>
              </div>

              {/* Name & Subject */}
              <div className="truncate text-[9.5px] font-bold text-black leading-tight mt-0.5">
                {seat.student?.name}
              </div>
              <div className="text-[8px] text-black uppercase tracking-wider truncate leading-none">
                {seat.subjectName}
              </div>

              {/* Handwriting Lines: Ans. Script No & Sign */}
              <div className="mt-0.5 pt-0.5 border-t border-black/50 text-[8px] text-black space-y-0.5">
                <div className="flex items-baseline justify-between leading-none">
                  <span className="font-semibold shrink-0">Ans. Script No:</span>
                  <span className="border-b border-black flex-1 ml-1 h-2 inline-block" />
                </div>
                <div className="flex items-baseline justify-between leading-none">
                  <span className="font-semibold shrink-0">Sign:</span>
                  <span className="border-b border-black flex-1 ml-1 h-2 inline-block" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Mode 2: Interactive Bench Card (Web Grid View)
 */
function InteractiveBenchCard({
  bench,
  attendanceState,
  onToggle,
  onAnsScriptChange,
}: {
  bench: PhysicalBench;
  attendanceState: Record<string, AttendanceStudentState>;
  onToggle: (rollNo: string) => void;
  onAnsScriptChange: (rollNo: string, val: string) => void;
}) {
  const benchPrefix = bench.side === 'LEFT' ? 'L' : bench.side === 'MIDDLE' ? 'M' : 'R';
  const benchLabel = `${benchPrefix}${bench.benchNumber}`;

  return (
    <div className="flex items-stretch gap-2 bg-slate-50/80 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
      {/* Bench Indicator */}
      <div className="w-11 shrink-0 bg-white dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center font-headline font-bold text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 py-1">
        <span className="text-[9px] uppercase text-slate-400 dark:text-slate-500 font-semibold tracking-wide">BENCH</span>
        <span className="font-black text-sm">{benchLabel}</span>
      </div>

      {/* Bench Seats */}
      <div className="flex-1 flex gap-2 min-w-0">
        {bench.seats?.map((seat, sIdx) => {
          const posLabel =
            seat.position === 'SIDE_A' ? 'Side A' : seat.position === 'SIDE_B' ? 'Side B' : 'Center';

          if (!seat.student) {
            return (
              <div
                key={sIdx}
                className="flex-1 p-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 text-center flex flex-col justify-center items-center select-none"
              >
                <span className="text-[9px] uppercase text-slate-400 dark:text-slate-500 font-bold">{posLabel}</span>
                <span className="text-[10px] italic text-slate-400 dark:text-slate-500 font-medium">Vacant</span>
              </div>
            );
          }

          const roll = seat.student.rollNo;
          const curState = attendanceState[roll] || {
            rollNo: roll,
            name: seat.student.name,
            section: seat.student.section,
            subject: seat.subjectName,
            status: 'Present',
            ansScriptNo: '',
          };

          const isAbsent = curState.status === 'Absent';

          return (
            <div
              key={sIdx}
              onClick={() => onToggle(roll)}
              className={cn(
                "flex-1 p-2 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between min-w-0",
                isAbsent
                  ? "bg-rose-50/90 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 shadow-xs ring-1 ring-rose-300 dark:ring-rose-800"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-xs"
              )}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    {posLabel}
                  </span>
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider",
                      isAbsent
                        ? "bg-rose-600 text-white"
                        : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    )}
                  >
                    {isAbsent ? 'Absent' : 'Present'}
                  </span>
                </div>

                <div className="font-headline font-black text-xs text-slate-900 dark:text-white tracking-tight">
                  {roll}
                </div>
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate" title={seat.student.name}>
                  {seat.student.name}
                </div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  {seat.subjectName}
                </div>
              </div>

              {/* Ans Script No input */}
              <div className="mt-2 pt-1 border-t border-slate-200/80 dark:border-slate-700/80" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={curState.ansScriptNo || ''}
                  onChange={(e) => onAnsScriptChange(roll, e.target.value)}
                  placeholder="Script No."
                  className="w-full text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Mode 2: Mobile / Compact Student Card (Single-Column Touch Friendly)
 */
function DigitalStudentCard({
  student,
  onToggle,
  onAnsScriptChange,
}: {
  student: AttendanceStudentState;
  onToggle: () => void;
  onAnsScriptChange: (val: string) => void;
}) {
  const isAbsent = student.status === 'Absent';

  return (
    <div
      onClick={onToggle}
      className={cn(
        "p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs select-none",
        isAbsent
          ? "bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 ring-1 ring-rose-300 dark:ring-rose-800"
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">{student.rollNo}</span>
            <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.2 rounded">
              {student.benchLabel} ({student.position})
            </span>
          </div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{student.name}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {student.subject} • Sec {student.section}
          </div>
        </div>

        {/* Present / Absent Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0",
            isAbsent
              ? "bg-rose-600 text-white hover:bg-rose-700"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          )}
        >
          {isAbsent ? (
            <>
              <XCircle className="w-3.5 h-3.5" />
              <span>Absent</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Present</span>
            </>
          )}
        </button>
      </div>

      {/* Script No field */}
      <div
        className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Script No:</span>
        <input
          type="text"
          value={student.ansScriptNo || ''}
          onChange={(e) => onAnsScriptChange(e.target.value)}
          placeholder="Ans. Script No."
          className="flex-1 text-[11px] font-mono px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

