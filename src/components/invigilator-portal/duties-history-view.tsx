"use client";

import React, { useState } from 'react';
import { InvigilatorDuty } from '@/lib/invigilator-portal-types';
import { RoomAttendanceSheet } from './room-attendance-sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  DoorOpen,
  Users,
  CheckCircle2,
  Eye,
  History,
  ArrowRight,
} from 'lucide-react';

interface DutiesHistoryViewProps {
  duties: InvigilatorDuty[];
}

export function DutiesHistoryView({ duties }: DutiesHistoryViewProps) {
  const [selectedDuty, setSelectedDuty] = useState<InvigilatorDuty | null>(null);

  if (selectedDuty) {
    return (
      <RoomAttendanceSheet
        duty={selectedDuty}
        onBack={() => setSelectedDuty(null)}
        isViewOnly={true}
      />
    );
  }

  if (duties.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
          <History className="w-6 h-6" />
        </div>
        <h3 className="font-headline font-bold text-base text-slate-800">
          No Past Duties Found
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Completed and submitted duties will appear here for review and historical records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-headline font-black text-xl text-slate-900 tracking-tight">
          Duties History
        </h2>
        <p className="text-xs text-slate-500">
          Review previous examination sessions and submitted room attendance
        </p>
      </div>

      {/* Desktop / Tablet Table (Requirement 12) */}
      <div className="hidden sm:block overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Room</th>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4 text-center">Students</th>
              <th className="py-3 px-4 text-center">Attendance</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {duties.map((duty) => (
              <tr
                key={duty.dutyId}
                onClick={() => setSelectedDuty(duty)}
                className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
              >
                <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                  {duty.formattedDate}
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  {duty.subjectName}
                  <div className="text-[10px] text-slate-400 font-normal">
                    {duty.examName}
                  </div>
                </td>
                <td className="py-3.5 px-4 font-bold text-indigo-700">
                  Room {duty.roomNo}
                </td>
                <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                  {duty.sessionTime}
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                  {duty.totalStudents}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {duty.attendanceSubmitted ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                      Submitted ✓
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[10px]">
                      Pending
                    </Badge>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDuty(duty);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 h-8 font-bold text-xs gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List (Requirement 19) */}
      <div className="block sm:hidden space-y-3">
        {duties.map((duty) => (
          <div
            key={duty.dutyId}
            onClick={() => setSelectedDuty(duty)}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-indigo-700">
                Room {duty.roomNo}
              </span>
              {duty.attendanceSubmitted ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                  Submitted ✓
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[10px]">
                  Pending
                </Badge>
              )}
            </div>

            <h3 className="font-bold text-slate-900 text-sm mb-1">
              {duty.subjectName}
            </h3>
            <p className="text-[11px] text-slate-500 mb-2">
              {duty.examName}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{duty.formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{duty.startTime}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{duty.totalStudents} Students</span>
              </div>
              <div className="flex items-center justify-end text-indigo-600 font-bold text-xs gap-1">
                <span>View Attendance</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
