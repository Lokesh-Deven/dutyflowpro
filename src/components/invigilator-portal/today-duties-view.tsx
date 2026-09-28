"use client";

import React from 'react';
import { InvigilatorDuty } from '@/lib/invigilator-portal-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DoorOpen,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  ClipboardList,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface TodayDutiesViewProps {
  duties: InvigilatorDuty[];
  onSelectDuty: (duty: InvigilatorDuty) => void;
}

export function TodayDutiesView({ duties, onSelectDuty }: TodayDutiesViewProps) {
  if (duties.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="font-headline font-bold text-base text-slate-800">
          No Duties Assigned For Today
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          You currently have no active examination duties scheduled for today. Check Duties History to review past sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline font-black text-xl text-slate-900 tracking-tight">
            Today&apos;s Duties
          </h2>
          <p className="text-xs text-slate-500">
            {duties.length} session{duties.length > 1 ? 's' : ''} assigned for today in chronological order
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {duties.map((duty, idx) => {
          const isSubmitted = duty.attendanceSubmitted;

          return (
            <div
              key={duty.dutyId}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header Strip */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-headline font-black text-sm text-indigo-900 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                    Duty {idx + 1}
                  </span>
                  {isSubmitted ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Submitted {duty.submittedAt ? `(${duty.submittedAt})` : ''}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-xs">
                      Attendance Pending
                    </Badge>
                  )}
                </div>

                {/* Duty Details */}
                <div className="space-y-2 mb-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {duty.examName}
                  </div>
                  <h3 className="font-headline font-black text-xl text-slate-900">
                    {duty.subjectName}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-semibold">{duty.formattedDate}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-semibold">{duty.sessionTime}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-700">
                      <DoorOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Room <strong className="text-slate-900 font-bold">{duty.roomNo}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Strength: <strong className="text-slate-900 font-bold">{duty.totalStudents}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-100">
                <Button
                  onClick={() => onSelectDuty(duty)}
                  className={`w-full font-bold text-xs h-10 rounded-xl transition-all shadow-xs gap-2 ${
                    isSubmitted
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                      : 'bg-[#1E2A5E] hover:bg-[#151D42] text-white'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>{isSubmitted ? 'View Submitted Attendance' : 'Take Attendance'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
