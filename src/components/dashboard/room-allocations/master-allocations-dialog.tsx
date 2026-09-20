"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SavedAllotment, Examination } from '@/lib/types';
import { formatAppDateWithDay } from '@/lib/date-utils';
import {
  FileText,
  DoorOpen,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Lock,
  Download,
  AlertCircle
} from 'lucide-react';

interface MasterAllocationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allotment: SavedAllotment;
  onDownloadPdf: () => void;
  isDownloadingPdf?: boolean;
}

export function MasterAllocationsDialog({
  open,
  onOpenChange,
  allotment,
  onDownloadPdf,
  isDownloadingPdf = false,
}: MasterAllocationsDialogProps) {
  const sortedExams = React.useMemo(() => {
    if (!allotment?.examinations) return [];
    return [...allotment.examinations].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [allotment?.examinations]);

  const roomAllocations = allotment.roomAllocations || {};

  const stats = React.useMemo(() => {
    let allocated = 0;
    let locked = 0;
    sortedExams.forEach(e => {
      const a = roomAllocations[e.id];
      if (a?.status === 'Locked') locked++;
      if (a?.status === 'Generated' || a?.status === 'Locked') allocated++;
    });
    return {
      total: sortedExams.length,
      allocated,
      locked,
      pending: sortedExams.length - allocated,
    };
  }, [sortedExams, roomAllocations]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-bold font-headline text-slate-800 flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-indigo-600" />
                Master Room Allocations
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Complete overview of duty room allocations across all sessions in <strong className="text-slate-700">{allotment.name}</strong>.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={onDownloadPdf}
                disabled={isDownloadingPdf}
                className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-bold text-xs h-8 px-3 gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                {isDownloadingPdf ? "Generating PDF..." : "Download All in One PDF"}
              </Button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
              Total Sessions: <strong className="ml-1 text-slate-900">{stats.total}</strong>
            </Badge>
            <Badge className="bg-emerald-600 text-white">
              Allocated: <strong className="ml-1">{stats.allocated}</strong>
            </Badge>
            <Badge className="bg-amber-500 text-white">
              Locked: <strong className="ml-1">{stats.locked}</strong>
            </Badge>
            {stats.pending > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Pending: <strong className="ml-1">{stats.pending}</strong>
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable List of All Examination Sessions */}
        <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
          {sortedExams.map((exam, idx) => {
            const alloc = roomAllocations[exam.id];
            const isAllocated = alloc && (alloc.status === 'Generated' || alloc.status === 'Locked');
            const isLocked = alloc?.status === 'Locked';

            return (
              <div
                key={exam.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3"
              >
                {/* Session Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center font-bold text-[11px]">
                        {idx + 1}
                      </span>
                      <h4 className="font-headline font-bold text-sm text-slate-800">
                        {exam.subject}
                      </h4>
                      {isLocked ? (
                        <Badge className="bg-amber-500 text-white font-bold text-[10px] h-4 gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </Badge>
                      ) : isAllocated ? (
                        <Badge className="bg-emerald-600 text-white font-bold text-[10px] h-4">
                          Allocated
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 text-[10px] h-4">
                          Pending
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1 font-medium pl-7">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-indigo-500" />
                        {formatAppDateWithDay(exam.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        {exam.startTime} – {exam.endTime}
                      </span>
                      <span>
                        Rooms: <strong className="text-slate-700">{exam.rooms}</strong> &bull; Relievers: <strong className="text-slate-700">{exam.relievers}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Session Content */}
                {!isAllocated || !alloc ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
                    <AlertCircle className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                    Room allocation is pending for this examination session ({exam.rooms} invigilators & {exam.relievers} relievers needed).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Invigilators List */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <DoorOpen className="w-3.5 h-3.5 text-indigo-600" />
                        Invigilators ({alloc.invigilatorDuties.length} Rooms)
                      </div>
                      <div className="rounded-lg border border-slate-200 overflow-hidden max-h-52 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="py-1.5 px-2 w-10 text-center">#</th>
                              <th className="py-1.5 px-2.5 w-24">Room</th>
                              <th className="py-1.5 px-3">Invigilator</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {alloc.invigilatorDuties.map((duty, dIdx) => (
                              <tr key={duty.invigilatorId} className="hover:bg-indigo-50/20">
                                <td className="py-1.5 px-2 text-center text-slate-400 text-[11px]">
                                  {dIdx + 1}
                                </td>
                                <td className="py-1.5 px-2.5 font-bold text-indigo-700 text-xs">
                                  {duty.room}
                                </td>
                                <td className="py-1.5 px-3 text-slate-800 font-medium">
                                  {duty.invigilatorName}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Relievers List */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-purple-600" />
                        Relievers ({alloc.relieverDuties.length} Assigned)
                      </div>
                      <div className="rounded-lg border border-slate-200 overflow-hidden max-h-52 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="py-1.5 px-2 w-10 text-center">#</th>
                              <th className="py-1.5 px-3 w-36">Reliever</th>
                              <th className="py-1.5 px-3">Assigned Rooms</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {alloc.relieverDuties.map((duty, rIdx) => (
                              <tr key={duty.relieverId} className="hover:bg-purple-50/20">
                                <td className="py-1.5 px-2 text-center text-slate-400 text-[11px]">
                                  {rIdx + 1}
                                </td>
                                <td className="py-1.5 px-3 font-medium text-slate-800">
                                  {duty.relieverName}
                                </td>
                                <td className="py-1.5 px-3">
                                  <div className="flex flex-wrap gap-1">
                                    {duty.rooms.map((r) => (
                                      <span
                                        key={r}
                                        className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded"
                                      >
                                        {r}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="pt-3 border-t border-slate-200 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-slate-500 font-medium">
            {stats.allocated} of {stats.total} sessions allocated
          </div>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-[#1E2A5E] hover:bg-[#151D42] text-white font-semibold text-xs px-5 h-9"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
