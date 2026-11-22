"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useAllotment } from '@/lib/allotment-context';
import { useStudentSeating } from '@/lib/student-seating-context';
import { getDemoSeatingAllocation } from '@/lib/room-attendance-sample-data';
import {
  getRoomPublishMap,
  isRoomPublished,
  setRoomPublishStatus,
  publishAllRooms,
  unpublishAllRooms,
} from '@/lib/room-attendance-publishing-service';
import { getAllAttendanceSubmissions } from '@/lib/invigilator-portal-service';
import { RoomAttendanceTabs } from '@/components/dashboard/room-attendance/room-attendance-tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  UserCheck,
  Globe,
  Lock,
  Unlock,
  DoorOpen,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
  ShieldCheck,
  Smartphone,
  Info,
} from 'lucide-react';

export default function InvigilatorAttendancePage() {
  const { user } = useAuth();
  const { activeAllotment } = useAllotment();
  const { allocations } = useStudentSeating();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [publishVersion, setPublishVersion] = useState(0);

  // Available allocations or fallback demo allocation
  const currentAllocation = useMemo(() => {
    if (allocations && allocations.length > 0) {
      return allocations[0];
    }
    return getDemoSeatingAllocation();
  }, [allocations]);

  // Exam details
  const examName = currentAllocation?.examination?.examName || 'Semester Examination 2026';
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

  // Map of invigilator duties from active allotment room allocations
  const invigilatorDutyByRoom = useMemo(() => {
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

  // Map of existing attendance submissions
  const submissionsMap = useMemo(() => {
    const submissions = getAllAttendanceSubmissions();
    const map = new Map<string, any>();
    submissions.forEach((s) => map.set(String(s.roomNo).trim(), s));
    return map;
  }, [publishVersion]);

  // Prepared rooms list with duty & student info
  const roomRows = useMemo(() => {
    const plans = currentAllocation?.roomPlans || [];
    return plans.map((plan) => {
      const roomNo = String(plan.roomNo).trim();
      const allocatedInvigilator =
        invigilatorDutyByRoom.get(roomNo) ||
        (roomNo === '101' ? 'Dr. Ramesh Kumar' : roomNo === '104' ? 'Prof. Anita Sharma' : 'Faculty Invigilator');

      // Unique subjects in this room
      const subjects = Array.from(
        new Set(
          plan.benches
            ?.flatMap((b) => b.seats)
            ?.map((s) => s.subjectName)
            ?.filter((n): n is string => Boolean(n))
        )
      ).join(', ') || 'Prescribed Subjects';

      const published = isRoomPublished(roomNo, currentAllocation?.id, user?.id);
      const submission = submissionsMap.get(roomNo);

      return {
        roomId: plan.roomId || roomNo,
        roomNo,
        totalBenches: plan.totalBenches,
        studentCount: plan.allocatedCount,
        capacity: plan.capacity,
        subject: subjects,
        invigilator: allocatedInvigilator,
        isPublished: published,
        submission,
      };
    });
  }, [currentAllocation, invigilatorDutyByRoom, submissionsMap, user?.id, publishVersion]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return roomRows;
    const q = searchQuery.toLowerCase().trim();
    return roomRows.filter(
      (r) =>
        r.roomNo.toLowerCase().includes(q) ||
        r.invigilator.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q)
    );
  }, [roomRows, searchQuery]);

  // Stats
  const totalRoomsCount = roomRows.length;
  const publishedCount = roomRows.filter((r) => r.isPublished).length;
  const unpublishedCount = totalRoomsCount - publishedCount;

  // Toggle individual room publish
  const handleToggleRoomPublish = (roomNo: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setRoomPublishStatus(roomNo, nextStatus, currentAllocation?.id, user?.id);
    toast({
      title: nextStatus ? `Room ${roomNo} Published!` : `Room ${roomNo} Unpublished`,
      description: nextStatus
        ? `Invigilator can now take attendance. Admin Attendance is locked for Room ${roomNo}.`
        : `Invigilator access revoked. Room ${roomNo} is now unlocked for Admin Attendance.`,
    });
  };

  // Global Publish All
  const handlePublishAll = () => {
    const allRoomNos = roomRows.map((r) => r.roomNo);
    publishAllRooms(allRoomNos, currentAllocation?.id, user?.id);
    toast({
      title: 'All Rooms Published to Invigilator Portal',
      description: `${allRoomNos.length} examination rooms are now operational on faculty invigilator portals.`,
    });
  };

  // Global Unpublish All
  const handleUnpublishAll = () => {
    const allRoomNos = roomRows.map((r) => r.roomNo);
    unpublishAllRooms(allRoomNos, currentAllocation?.id, user?.id);
    toast({
      title: 'All Rooms Unpublished',
      description: 'All rooms are now unlocked for mobile Admin Attendance (Floor Walk).',
    });
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* 4-Branch Navigation Switcher */}
      <RoomAttendanceTabs />

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <UserCheck className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="font-headline text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                Invigilator Attendance (Portal-Based)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Publish examination rooms to faculty invigilator mobile portals with conflict-prevention locks
              </p>
            </div>
          </div>
        </div>

        {/* Global Publish Actions */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUnpublishAll}
            disabled={publishedCount === 0}
            className="text-xs h-9 px-3 gap-1.5 font-bold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Unpublish All</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePublishAll}
            disabled={publishedCount === totalRoomsCount && totalRoomsCount > 0}
            className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 text-sky-300" />
            <span>Publish All Rooms</span>
          </Button>
        </div>
      </div>

      {/* Exclusivity & Conflict Prevention Explainer */}
      <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800 rounded-2xl p-4 text-xs text-blue-950 dark:text-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
              <span>Exclusivity &amp; Conflict Prevention Lock</span>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-extrabold">
                Active System Safeguard
              </span>
            </div>
            <p className="text-blue-800/90 dark:text-blue-300/90 text-[11px] leading-relaxed">
              When a room is <strong>Published</strong>, it appears on the allocated invigilator&apos;s portal and is automatically locked for <strong>Admin Attendance</strong>. To take or override attendance for a room via admin floor walk, simply click <strong>Unpublish</strong>.
            </p>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto font-bold text-xs">
          <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 py-1 px-3 gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {publishedCount} Published
          </Badge>
          <Badge variant="outline" className="text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 py-1 px-3">
            {unpublishedCount} Unpublished
          </Badge>
        </div>
      </div>

      {/* Rooms Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Room, Invigilator, Subject..."
                className="pl-9 text-xs h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold hidden md:block">
              {examName} • {examDate} ({examTimings})
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <strong>{filteredRooms.length}</strong> of <strong>{totalRoomsCount}</strong> allocated rooms
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4 text-center w-14">#</th>
                <th className="py-3 px-4">Room Number</th>
                <th className="py-3 px-4">Allocated Invigilator</th>
                <th className="py-3 px-4 text-center">Student Count</th>
                <th className="py-3 px-4">Subject(s)</th>
                <th className="py-3 px-4 text-center">Portal Status</th>
                <th className="py-3 px-4 text-center">Attendance Submission</th>
                <th className="py-3 px-4 text-right">Publishing Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No allocated rooms match your filter.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room, idx) => (
                  <tr key={room.roomId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400 dark:text-slate-500">
                      {idx + 1}
                    </td>

                    {/* Room Number */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-black font-mono text-xs">
                          {room.roomNo}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 dark:text-white font-headline text-sm">
                            Room {room.roomNo}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {room.totalBenches} Benches
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Allocated Invigilator */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{room.invigilator}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Allocated Faculty Member
                      </div>
                    </td>

                    {/* Student Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                        {room.studentCount}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                        / {room.capacity} Seats
                      </span>
                    </td>

                    {/* Subject */}
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {room.subject}
                    </td>

                    {/* Portal Status */}
                    <td className="py-3.5 px-4 text-center">
                      {room.isPublished ? (
                        <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold text-[10px] px-2.5 py-0.5 gap-1">
                          <Globe className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 font-medium text-[10px] px-2.5 py-0.5 gap-1">
                          <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          Unpublished
                        </Badge>
                      )}
                    </td>

                    {/* Attendance Submission */}
                    <td className="py-3.5 px-4 text-center">
                      {room.submission ? (
                        <Badge className="bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-bold text-[10px] px-2.5 py-0.5 gap-1">
                          <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          Completed ({room.submission.presentCount} P / {room.submission.absentCount} A)
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Publish / Unpublish Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      {room.isPublished ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleRoomPublish(room.roomNo, true)}
                          className="text-xs h-8 px-3 gap-1.5 font-bold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unpublish</span>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleToggleRoomPublish(room.roomNo, false)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 gap-1.5 shadow-2xs"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Publish</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
