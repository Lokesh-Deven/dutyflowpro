"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useAllotment } from '@/lib/allotment-context';
import { useStudentSeating } from '@/lib/student-seating-context';
import { getDemoSeatingAllocation } from '@/lib/room-attendance-sample-data';
import {
  getAllAttendanceSubmissions,
  getInvigilatorDuties,
} from '@/lib/invigilator-portal-service';
import { RoomAttendanceSubmission } from '@/lib/invigilator-portal-types';
import { RoomAttendanceTabs } from '@/components/dashboard/room-attendance/room-attendance-tabs';
import {
  generateAttendanceStatusPdf,
  RoomStatusReportItem,
} from '@/lib/attendance-status-pdf-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  BarChart2,
  FileText,
  Download,
  Printer,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  DoorOpen,
  Users,
  Calendar,
  Clock,
  ShieldCheck,
  Smartphone,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';

export default function AttendanceStatusPage() {
  const { user, profile } = useAuth();
  const { activeAllotment, signatory, pdfPaletteId } = useAllotment();
  const { allocations } = useStudentSeating();
  const { toast } = useToast();

  const [submissions, setSubmissions] = useState<RoomAttendanceSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState<RoomAttendanceSubmission | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Institution & Exam Info
  const institutionName =
    profile?.institution_name?.trim() ||
    activeAllotment?.examinations?.[0]?.college?.trim() ||
    'DUTYFLOW EXAMINATIONS INSTITUTION';

  const currentAllocation = useMemo(() => {
    if (allocations && allocations.length > 0) return allocations[0];
    return getDemoSeatingAllocation();
  }, [allocations]);

  const examName = currentAllocation?.examination?.examName || 'Semester Examination 2026';
  const examDate = currentAllocation?.examination?.date || '2026-12-10';
  const examTimings = `${currentAllocation?.examination?.startTime || '11:00 AM'} – ${
    currentAllocation?.examination?.endTime || '12:30 PM'
  }`;

  // Load submissions
  const loadSubmissions = () => {
    setIsRefreshing(true);
    const list = getAllAttendanceSubmissions();

    // If no submissions in localStorage yet, include sample demo Room 108 submission for instant administrative preview
    if (list.length === 0) {
      const demoSub: RoomAttendanceSubmission = {
        id: 'sub-demo-108',
        dutyId: 'demo-duty-108-english',
        examinationId: 'exam-eng-midterm',
        examName: examName,
        subjectName: 'English',
        date: examDate,
        sessionTime: examTimings,
        roomNo: '108',
        invigilatorId: 'inv-kumar-001',
        invigilatorName: 'Mr. Kumar',
        totalStudents: 32,
        presentCount: 29,
        absentCount: 3,
        submittedAt: '10:45 AM',
        submittedTimestamp: new Date().toISOString(),
        isLocked: true,
        source: 'Invigilator',
        records: [
          { registerNumber: '101', studentName: 'Aarav Patel', section: '2A', benchNumber: 'B1', position: 'Left', status: 'Present' },
          { registerNumber: '102', studentName: 'Ananya Sharma', section: '2A', benchNumber: 'B1', position: 'Right', status: 'Present' },
          { registerNumber: '103', studentName: 'Bhavya Rao', section: '2A', benchNumber: 'B2', position: 'Left', status: 'Absent' },
          { registerNumber: '104', studentName: 'Chirag Mehta', section: '2A', benchNumber: 'B2', position: 'Right', status: 'Present' },
          { registerNumber: '105', studentName: 'Divya Nair', section: '2A', benchNumber: 'B3', position: 'Left', status: 'Present' },
          { registerNumber: '106', studentName: 'Eshan Roy', section: '2A', benchNumber: 'B3', position: 'Right', status: 'Absent' },
          { registerNumber: '123456', studentName: 'Rahul Kumar', section: '2A', benchNumber: 'B12', position: 'Left', status: 'Present' },
        ],
      };
      setSubmissions([demoSub]);
    } else {
      setSubmissions(list);
    }
    setTimeout(() => setIsRefreshing(false), 250);
  };

  useEffect(() => {
    loadSubmissions();
    const handleUpdate = () => loadSubmissions();
    window.addEventListener('dutyflow:attendance-updated', handleUpdate);
    return () => window.removeEventListener('dutyflow:attendance-updated', handleUpdate);
  }, []);

  // Invigilator by room
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

  // Submission map by roomNo
  const subMap = useMemo(() => {
    const map = new Map<string, RoomAttendanceSubmission>();
    submissions.forEach((s) => map.set(String(s.roomNo).trim(), s));
    return map;
  }, [submissions]);

  // Combined master room status list across all allocated rooms
  const roomStatusItems: RoomStatusReportItem[] = useMemo(() => {
    const plans = currentAllocation?.roomPlans || [];
    return plans.map((plan) => {
      const roomNo = String(plan.roomNo).trim();
      const sub = subMap.get(roomNo);
      const invigilator =
        sub?.invigilatorName ||
        invigilatorByRoom.get(roomNo) ||
        (roomNo === '101' ? 'Dr. Ramesh Kumar' : roomNo === '104' ? 'Prof. Anita Sharma' : 'Faculty Invigilator');

      const subjects =
        sub?.subjectName ||
        Array.from(
          new Set(
            plan.benches
              ?.flatMap((b) => b.seats)
              ?.map((s) => s.subjectName)
              ?.filter((n): n is string => Boolean(n))
          )
        ).join(', ') || 'Subjects';

      const totalStudents = sub?.totalStudents || plan.allocatedCount || 30;
      const presentCount = sub?.presentCount || 0;
      const absentCount = sub?.absentCount || 0;
      const source = (sub?.source as any) || (sub ? 'Invigilator' : 'Pending');
      const status = sub ? 'Completed' : 'Pending';

      return {
        roomNo,
        invigilator,
        subject: subjects,
        totalStudents,
        presentCount,
        absentCount,
        source,
        status,
        submittedAt: sub?.submittedAt,
      };
    });
  }, [currentAllocation, subMap, invigilatorByRoom]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return roomStatusItems;
    const q = searchQuery.toLowerCase().trim();
    return roomStatusItems.filter(
      (r) =>
        r.roomNo.toLowerCase().includes(q) ||
        r.invigilator.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q)
    );
  }, [roomStatusItems, searchQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalRooms = roomStatusItems.length;
    let completedRooms = 0;
    let pendingRooms = 0;
    let totalStrength = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    const invigilatorsSet = new Set<string>();

    roomStatusItems.forEach((item) => {
      if (item.invigilator) invigilatorsSet.add(item.invigilator);
      totalStrength += item.totalStudents;
      if (item.status === 'Completed') {
        completedRooms++;
        totalPresent += item.presentCount;
        totalAbsent += item.absentCount;
      } else {
        pendingRooms++;
      }
    });

    const completionRate = totalRooms > 0 ? Math.round((completedRooms / totalRooms) * 100) : 0;
    const attendancePercentage = totalStrength > 0 ? Math.round((totalPresent / Math.max(1, totalPresent + totalAbsent)) * 100) : 0;

    return {
      totalRooms,
      completedRooms,
      pendingRooms,
      invigilatorsAllocated: invigilatorsSet.size || totalRooms,
      totalStrength,
      totalPresent,
      totalAbsent,
      completionRate,
      attendancePercentage,
    };
  }, [roomStatusItems]);

  // PDF Export
  const handleGeneratePdfReport = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateAttendanceStatusPdf({
        institutionName,
        examName,
        dateStr: examDate,
        sessionTime: examTimings,
        items: roomStatusItems,
        submissions,
        signatory,
        paletteId: pdfPaletteId,
      });
      toast({
        title: 'PDF Report Generated',
        description: 'Attendance Status & Absentees Report downloaded successfully.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: err.message || 'Could not generate PDF report.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // CSV Export
  const handleDownloadCsv = () => {
    const headers = [
      'Room No',
      'Allocated Invigilator',
      'Subject',
      'Total Students',
      'Present',
      'Absent',
      'Collection Source',
      'Completion Status',
    ];

    const rows = roomStatusItems.map((r) => [
      `"Room ${r.roomNo}"`,
      `"${r.invigilator}"`,
      `"${r.subject}"`,
      r.totalStudents,
      r.presentCount,
      r.absentCount,
      `"${r.source}"`,
      `"${r.status}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DutyFlow_Attendance_Status_${examDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'CSV Exported',
      description: 'Room Attendance Status CSV report downloaded.',
    });
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* 4-Branch Navigation Switcher */}
      <RoomAttendanceTabs />

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <BarChart2 className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800">
                  Attendance Status
                </h1>
                <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Single Source of Truth
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Central real-time monitoring across Invigilator, Admin floor walk, and Manual workflows
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadSubmissions}
            disabled={isRefreshing}
            className="text-xs h-9 px-3 gap-1.5 font-bold text-slate-700"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            className="text-xs h-9 px-3 gap-1.5 font-bold text-slate-700 border-slate-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleGeneratePdfReport}
            disabled={isGeneratingPdf}
            className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Generate Report (PDF)'}</span>
          </Button>
        </div>
      </div>

      {/* Automatic Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Rooms */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Total Rooms</span>
            <DoorOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {summaryMetrics.totalRooms}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            <strong className="text-emerald-700 font-bold">{summaryMetrics.completedRooms}</strong> Completed • {summaryMetrics.pendingRooms} Pending
          </div>
        </div>

        {/* Invigilators Allocated */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Invigilators</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {summaryMetrics.invigilatorsAllocated}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Allocated Faculty Duties
          </div>
        </div>

        {/* Total Student Strength */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Total Strength</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {summaryMetrics.totalStrength}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Candidates Scheduled
          </div>
        </div>

        {/* Number of Present Students */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
            <span>Total Present</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-950">
            {summaryMetrics.totalPresent}
          </div>
          <div className="text-[11px] text-emerald-700 font-bold">
            {summaryMetrics.attendancePercentage}% Attendance Rate
          </div>
        </div>

        {/* Number of Absent Students */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
            <span>Total Absent</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-950">
            {summaryMetrics.totalAbsent}
          </div>
          <div className="text-[11px] text-rose-700 font-bold">
            {summaryMetrics.totalAbsent > 0 ? `${summaryMetrics.totalAbsent} Candidates Absent` : '100% Present'}
          </div>
        </div>
      </div>

      {/* Central Rooms Status Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by Room, Invigilator, Source..."
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>{examDate} ({examTimings})</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500">
              <tr>
                <th className="py-3 px-4 text-center w-12">#</th>
                <th className="py-3 px-4">Room No</th>
                <th className="py-3 px-4">Allocated Invigilator</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-3 text-center">Strength</th>
                <th className="py-3 px-3 text-center">Present</th>
                <th className="py-3 px-3 text-center">Absent</th>
                <th className="py-3 px-4 text-center">Collection Source</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Roster</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 font-medium">
                    No examination rooms found matching your search.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((item, idx) => {
                  const sub = subMap.get(item.roomNo);

                  return (
                    <tr key={item.roomNo} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Room No */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#1E2A5E] text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                            {item.roomNo}
                          </div>
                          <span className="font-headline font-bold text-slate-900 text-sm">
                            Room {item.roomNo}
                          </span>
                        </div>
                      </td>

                      {/* Invigilator */}
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {item.invigilator}
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {item.subject}
                      </td>

                      {/* Total Strength */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-900">
                        {item.totalStudents}
                      </td>

                      {/* Present */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-xs">
                          {item.status === 'Completed' ? item.presentCount : '—'}
                        </span>
                      </td>

                      {/* Absent */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={cn(
                            "font-mono font-bold px-2 py-0.5 rounded-full text-xs",
                            item.absentCount > 0
                              ? "text-rose-800 bg-rose-50 border border-rose-200"
                              : "text-slate-500 bg-slate-100"
                          )}
                        >
                          {item.status === 'Completed' ? item.absentCount : '—'}
                        </span>
                      </td>

                      {/* Collection Source Indicator */}
                      <td className="py-3.5 px-4 text-center">
                        {item.source === 'Invigilator' ? (
                          <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold gap-1">
                            <UserCheck className="w-3 h-3 text-blue-600" />
                            Submitted via Invigilator
                          </Badge>
                        ) : item.source === 'Admin' ? (
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold gap-1">
                            <Smartphone className="w-3 h-3 text-emerald-600" />
                            Submitted via Admin
                          </Badge>
                        ) : item.source === 'Manual' ? (
                          <Badge className="bg-purple-50 text-purple-800 border-purple-200 text-[10px] font-bold gap-1">
                            <FileSpreadsheet className="w-3 h-3 text-purple-600" />
                            Submitted via Manual
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-300 text-[10px]">
                            Pending Collection
                          </Badge>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {item.status === 'Completed' ? (
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Completed
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* View Roster Action */}
                      <td className="py-3.5 px-4 text-right">
                        {sub ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSub(sub)}
                            className="text-xs h-8 px-2.5 gap-1 font-bold text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Roster</span>
                          </Button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">No submission</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Student Roster Dialog */}
      <Dialog open={Boolean(selectedSub)} onOpenChange={(open) => !open && setSelectedSub(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedSub && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#1E2A5E] text-white rounded-xl font-bold font-mono text-sm">
                      {selectedSub.roomNo}
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-black text-slate-800">
                        Room {selectedSub.roomNo} Student Attendance Roster
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500">
                        Submitted via {selectedSub.source || 'Invigilator'} ({selectedSub.invigilatorName}) at {selectedSub.submittedAt}
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300">
                      {selectedSub.presentCount} Present
                    </Badge>
                    <Badge className="bg-rose-50 text-rose-800 border-rose-300">
                      {selectedSub.absentCount} Absent
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-center w-10">#</th>
                      <th className="py-2 px-3 font-mono">Roll No</th>
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-2 text-center w-14">Section</th>
                      <th className="py-2 px-2 text-center w-16">Bench</th>
                      <th className="py-2 px-3 text-center w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSub.records?.map((rec, idx) => (
                      <tr key={rec.registerNumber} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{rec.registerNumber}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{rec.studentName}</td>
                        <td className="py-2 px-2 text-center font-semibold text-slate-600">{rec.section}</td>
                        <td className="py-2 px-2 text-center font-semibold text-slate-600">{rec.benchNumber || '—'}</td>
                        <td className="py-2 px-3 text-center">
                          {rec.status === 'Present' ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Present
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                              Absent
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
